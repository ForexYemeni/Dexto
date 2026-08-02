import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword, comparePassword, signToken, setAuthCookie,
  generateReferralCode, getCurrentUser, clearAuthCookie,
  normalizePhone, isValidPhone,
} from '@/lib/auth'
import { seedDatabase } from '@/lib/seed'
import { notifyAdmins } from '@/lib/notify-admins'

// Auto-seed on first request + admin migration (idempotent)
// NOTE: `seeded` is only set to true on SUCCESS. If the migration throws,
// we leave it false so the next request will retry.
let seeded = false
async function ensureSeed() {
  if (seeded) return
  try {
    const userCount = await db.user.count()
    if (userCount === 0) {
      // Fresh database — full seed (creates official admin 773178684 / admin123)
      await seedDatabase()
    } else {
      // Existing database — ensure the official admin account is set up
      // for phone-based authentication (one-time migration from email→phone).
      await migrateAdminToPhone()
    }
    seeded = true
  } catch (e) {
    // Do NOT set seeded=true here — we want the next request to retry.
    console.error('ensureSeed error (will retry on next request):', e)
  }
}

/**
 * One-time migration: convert the legacy email-based admin account to the
 * phone-based official admin (phone: 773178684, password: admin123).
 *
 * Idempotency rules:
 *   1. If an admin with phone "773178684" already exists → do nothing (already migrated).
 *   2. If no admin exists at all → create the official admin.
 *   3. If an admin exists with phone=null (legacy email-based) → set phone to
 *      773178684 AND reset password to admin123.
 *   4. If an admin exists with a DIFFERENT phone (user changed it) → do nothing,
 *      we assume the user has intentionally customized the admin account.
 *
 * This runs on EVERY cold start until migration is complete, then becomes a no-op.
 */
async function migrateAdminToPhone() {
  try {
    // Rule 1: official admin already exists?
    // Use findFirst (not findUnique) because MongoDB may not have a unique
    // index on `phone` yet (prisma db push hasn't been run in production).
    const official = await db.user.findFirst({ where: { phone: '773178684' } })
    if (official) {
      // Already migrated. DO NOT touch the password — the admin may have
      // changed it intentionally via the Admin Settings panel, and resetting
      // it back to admin123 would lock them out of their new password.
      return
    }

    // Find any existing admin account
    const admin = await db.user.findFirst({ where: { role: 'admin' } })

    if (!admin) {
      // Rule 2: no admin at all — create the official one
      const passwordHash = await hashPassword('admin123')
      await db.user.create({
        data: {
          phone: '773178684',
          email: 'admin@dexto.local',
          name: 'Super Admin',
          passwordHash,
          referralCode: 'ADMIN2026',
          role: 'admin',
          status: 'active',
          balance: 0,
          language: 'ar',
          theme: 'dark',
        },
      })
      console.log('[migration] Created official admin: phone=773178684 password=admin123')
      return
    }

    // Rule 3: legacy admin with no phone (or empty phone) — migrate to phone + reset password
    if (!admin.phone || admin.phone === '') {
      const passwordHash = await hashPassword('admin123')
      // Use raw update to avoid Prisma's strict type checking on legacy docs
      try {
        await (db as any).$runCommandRaw({
          update: 'users',
          updates: [
            {
              q: { _id: (admin as any).id ?? (admin as any)._id },
              u: {
                $set: {
                  phone: '773178684',
                  passwordHash,
                },
              },
            },
          ],
        })
        console.log('[migration] Migrated existing admin to phone=773178684 password=admin123 (raw update)')
      } catch (rawErr) {
        // Fallback to Prisma
        await db.user.update({
          where: { id: admin.id },
          data: {
            phone: '773178684',
            passwordHash,
          },
        })
        console.log('[migration] Migrated existing admin to phone=773178684 password=admin123 (prisma update)')
      }
      return
    }

    // Rule 4: admin has a different phone — leave it alone
    // (user has intentionally customized the admin account)
    console.log('[migration] Admin has custom phone:', admin.phone, '— skipping migration')
  } catch (e) {
    console.error('migrateAdminToPhone error:', e)
    // Re-throw so ensureSeed doesn't mark as seeded
    throw e
  }
}

/**
 * Force-create or force-reset the official admin account.
 * This is the nuclear option — called from the login function when the user
 * tries to log in with 773178684 / admin123 and it fails.
 *
 * Uses raw MongoDB commands to bypass Prisma's type validation, which is
 * necessary because legacy documents may have inconsistent field types.
 */
async function forceResetOfficialAdmin() {
  const passwordHash = await hashPassword('admin123')

  // 1. Check if official admin already exists (via raw command)
  const findResult: any = await (db as any).$runCommandRaw({
    find: 'users',
    filter: { phone: '773178684' },
    projection: { _id: 1, phone: 1, role: 1, status: 1 },
    limit: 1,
  })
  const official = findResult?.cursor?.firstBatch?.[0]

  if (official) {
    // Reset password + ensure status is active (via raw command)
    await (db as any).$runCommandRaw({
      update: 'users',
      updates: [
        {
          q: { _id: official._id },
          u: {
            $set: {
              passwordHash,
              status: 'active',
            },
          },
        },
      ],
    })
    console.log('[force-reset] Reset password for existing official admin (raw update)')
    return
  }

  // 2. Find any existing admin and convert to official (via raw command)
  const findAdminResult: any = await (db as any).$runCommandRaw({
    find: 'users',
    filter: { role: 'admin' },
    projection: { _id: 1, phone: 1 },
    limit: 1,
  })
  const admin = findAdminResult?.cursor?.firstBatch?.[0]

  if (admin) {
    await (db as any).$runCommandRaw({
      update: 'users',
      updates: [
        {
          q: { _id: admin._id },
          u: {
            $set: {
              phone: '773178684',
              passwordHash,
              status: 'active',
            },
          },
        },
      ],
    })
    console.log('[force-reset] Converted existing admin to official (raw update)')
    return
  }

  // 3. No admin at all — create one via Prisma (fresh document, no type issues)
  await db.user.create({
    data: {
      phone: '773178684',
      email: 'admin@dexto.local',
      name: 'Super Admin',
      passwordHash,
      referralCode: 'ADMIN2026',
      role: 'admin',
      status: 'active',
      balance: 0,
      language: 'ar',
      theme: 'dark',
    },
  })
  console.log('[force-reset] Created official admin from scratch')
}

// POST /api/auth
export async function POST(req: NextRequest) {
  await ensureSeed()
  const body = await req.json()
  const { action } = body

  if (action === 'login') {
    return login(req, body)
  } else if (action === 'register') {
    return register(req, body)
  } else if (action === 'logout') {
    return logout()
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// GET /api/auth - get current user
export async function GET(req: NextRequest) {
  await ensureSeed()
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      // Primary identifier is now the phone number
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      // allowedTabs controls which admin tabs a sub-admin can see.
      // NULL/empty = full access (primary admin). Comma-separated string otherwise.
      allowedTabs: user.allowedTabs ?? null,
      balance: user.balance,
      totalInvested: user.totalInvested,
      totalProfit: user.totalProfit,
      todayProfit: user.todayProfit,
      monthProfit: user.monthProfit,
      referralProfit: user.referralProfit,
      language: user.language,
      theme: user.theme,
      referralCode: user.referralCode,
      status: user.status,
      avatar: user.avatar,
    },
  })
}

async function login(req: NextRequest, body: any) {
  const { phone, password } = body
  if (!phone || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const normalizedPhone = normalizePhone(phone)
  if (!isValidPhone(normalizedPhone)) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  // Use findFirst (not findUnique) — MongoDB may not have a unique index on `phone`.
  const user = await db.user.findFirst({ where: { phone: normalizedPhone } })

  // NOTE: We intentionally do NOT have a "force reset" fallback here.
  // Previously, if login with 773178684 failed, we would force-reset the
  // password to admin123. But this meant the primary admin could NEVER
  // change their password — every failed login attempt would reset it.
  // Now the password is only changed via the Admin Settings panel.

  if (!user) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  if (user.status !== 'active') {
    return NextResponse.json({ error: 'account_suspended' }, { status: 403 })
  }

  const valid = await comparePassword(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const token = signToken({
    userId: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
  })
  await setAuthCookie(token)

  // Update lastLoginAt via raw command to avoid Prisma's strict id matching
  // (legacy MongoDB documents may have _id types that Prisma can't update by id)
  try {
    await (db as any).$runCommandRaw({
      update: 'users',
      updates: [
        {
          q: { _id: (user as any).id ?? (user as any)._id },
          u: { $set: { lastLoginAt: { $date: new Date().toISOString() } } },
        },
      ],
    })
  } catch (rawErr) {
    console.error('[login] Failed to update lastLoginAt:', rawErr)
    // Don't fail the login just because we couldn't update the timestamp
  }

  // Create activity log via raw command (same reason)
  try {
    await (db as any).$runCommandRaw({
      insert: 'activity_logs',
      documents: [
        {
          userId: (user as any).id ?? (user as any)._id,
          action: 'login',
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
          createdAt: { $date: new Date().toISOString() },
          updatedAt: { $date: new Date().toISOString() },
        },
      ],
    })
  } catch (rawErr) {
    console.error('[login] Failed to create activity log:', rawErr)
    // Don't fail the login
  }

  // Create daily login task completion (wrapped in try/catch to not fail login)
  try {
    await createDailyLoginTask(user.id)
  } catch (e) {
    console.error('[login] createDailyLoginTask failed (non-fatal):', e)
  }

  return NextResponse.json({
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      allowedTabs: user.allowedTabs ?? null,
      balance: user.balance,
      totalInvested: user.totalInvested,
      totalProfit: user.totalProfit,
      todayProfit: user.todayProfit,
      monthProfit: user.monthProfit,
      referralProfit: user.referralProfit,
      language: user.language,
      theme: user.theme,
      referralCode: user.referralCode,
      status: user.status,
    },
  })
}

async function register(req: NextRequest, body: any) {
  const { name, phone, password, referralCode, agreeToTerms } = body

  if (!name || !phone || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (!agreeToTerms) {
    return NextResponse.json({ error: 'must_agree_terms' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  const normalizedPhone = normalizePhone(phone)
  if (!isValidPhone(normalizedPhone)) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }

  // Use findFirst (not findUnique) — MongoDB may not have a unique index on `phone`.
  const existing = await db.user.findFirst({ where: { phone: normalizedPhone } })
  if (existing) {
    return NextResponse.json({ error: 'phone_exists' }, { status: 409 })
  }

  // Find referrer if code provided
  if (referralCode) {
    const referrer = await db.user.findFirst({ where: { referralCode } })
    if (!referrer) {
      return NextResponse.json({ error: 'invalid_referral_code' }, { status: 400 })
    }
  }

  const passwordHash = await hashPassword(password)
  const newReferralCode = generateReferralCode(name)

  // Generate a unique placeholder email to satisfy the legacy unique index
  // on `email` in MongoDB. Without this, creating two users with email=null
  // throws P2002 'Unique constraint failed on users_email_key'.
  // Format: user_<phone>@dexto.local — guaranteed unique because phone is unique.
  const placeholderEmail = `user_${normalizedPhone}@dexto.local`

  const user = await db.user.create({
    data: {
      phone: normalizedPhone,
      email: placeholderEmail,
      name,
      passwordHash,
      referralCode: newReferralCode,
      referredBy: referralCode || null,
      role: 'user',
      status: 'active',
      balance: 0,
      language: 'ar',
      theme: 'dark',
    },
  })

  // Create welcome notification
  await db.notification.create({
    data: {
      userId: user.id,
      type: 'system',
      title: 'Welcome to the platform!',
      titleAr: 'مرحباً بك في المنصة!',
      message: 'Your account has been created. Start mining to earn profits.',
      messageAr: 'تم إنشاء حسابك. ابدأ التعدين لكسب الأرباح.',
    },
  })

  // Notify all admins about new user registration
  await notifyAdmins({
    type: 'system',
    title: 'New User Registered',
    titleAr: 'تسجيل مستخدم جديد',
    message: `New user: ${name} (phone: ${normalizedPhone})${referralCode ? ` via referral: ${referralCode}` : ''}`,
    messageAr: `مستخدم جديد: ${name} (رقم: ${normalizedPhone})${referralCode ? ` عبر إحالة: ${referralCode}` : ''}`,
  })

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: 'register',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    },
  })

  const token = signToken({
    userId: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
  })
  await setAuthCookie(token)

  return NextResponse.json({
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      balance: user.balance,
      language: user.language,
      referralCode: user.referralCode,
      status: user.status,
    },
  })
}

async function logout() {
  await clearAuthCookie()
  return NextResponse.json({ success: true })
}

async function createDailyLoginTask(userId: string) {
  try {
    const task = await db.task.findFirst({ where: { type: 'daily_login', isActive: true } })
    if (!task) return

    // Check if already completed today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existing = await db.userTask.findFirst({
      where: {
        userId,
        taskId: task.id,
        createdAt: { gte: today, lt: tomorrow },
      },
    })
    if (existing) return

    // Create completed daily login task
    await db.userTask.create({
      data: {
        userId,
        taskId: task.id,
        status: 'completed',
        completedAt: new Date(),
        rewardAmount: task.rewardAmount,
        rewardPoints: task.rewardPoints,
      },
    })

    // Auto-credit reward
    await db.user.update({
      where: { id: userId },
      data: { balance: { increment: task.rewardAmount } },
    })

    await db.transaction.create({
      data: {
        userId,
        type: 'task_reward',
        amount: task.rewardAmount,
        description: `Daily login reward`,
        reference: task.id,
      },
    })

    await db.notification.create({
      data: {
        userId,
        type: 'task',
        title: 'Daily Login Reward!',
        titleAr: 'مكافأة تسجيل الدخول اليومي!',
        message: `You earned ${task.rewardAmount} USDT for daily login`,
        messageAr: `لقد ربحت ${task.rewardAmount} USDT لتسجيل الدخول اليومي`,
      },
    })
  } catch (e) {
    console.error('Error creating daily login task:', e)
  }
}
