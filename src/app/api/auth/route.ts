import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, comparePassword, signToken, setAuthCookie, generateReferralCode, getCurrentUser, clearAuthCookie } from '@/lib/auth'
import { seedDatabase } from '@/lib/seed'

// Auto-seed on first request
let seeded = false
async function ensureSeed() {
  if (seeded) return
  try {
    const userCount = await db.user.count()
    if (userCount === 0) {
      await seedDatabase()
    }
    seeded = true
  } catch (e) {
    seeded = true
  }
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
      email: user.email,
      name: user.name,
      role: user.role,
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
      phone: user.phone,
      avatar: user.avatar,
    },
  })
}

async function login(req: NextRequest, body: any) {
  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
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

  const token = signToken({ userId: user.id, email: user.email, role: user.role })
  await setAuthCookie(token)

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: 'login',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    },
  })

  // Create daily login task completion
  await createDailyLoginTask(user.id)

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
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
  const { name, email, password, confirmPassword, phone, referralCode, agreeToTerms } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'password_mismatch' }, { status: 400 })
  }
  if (!agreeToTerms) {
    return NextResponse.json({ error: 'must_agree_terms' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'email_exists' }, { status: 409 })
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

  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      phone: phone || null,
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

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: 'register',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    },
  })

  const token = signToken({ userId: user.id, email: user.email, role: user.role })
  await setAuthCookie(token)

  return NextResponse.json({
    user: {
      id: user.id,
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
