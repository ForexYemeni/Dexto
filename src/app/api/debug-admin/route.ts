import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, comparePassword } from '@/lib/auth'

/**
 * GET /api/debug-admin
 * Diagnostic endpoint — returns the current state of admin accounts in the DB.
 * This is INTENTIONALLY public (no auth) so we can debug login issues.
 * It only returns non-sensitive fields (no passwordHash).
 *
 * Once login works, this endpoint should be removed or protected.
 */
export async function GET(req: NextRequest) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  }

  try {
    // Step 1: Count all users
    const totalUsers = await db.user.count()
    debug.steps.push({ step: 'count_users', ok: true, count: totalUsers })

    // Step 2: Find all admins
    const admins = await db.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })
    debug.steps.push({
      step: 'find_admins',
      ok: true,
      count: admins.length,
      admins: admins.map((a) => ({
        id: a.id,
        phone: a.phone,
        phoneType: a.phone === null ? 'null' : a.phone === undefined ? 'undefined' : a.phone === '' ? 'empty' : 'value',
        email: a.email,
        name: a.name,
        status: a.status,
      })),
    })

    // Step 3: Check if any admin has phone 773178684
    const official = await db.user.findFirst({ where: { phone: '773178684' } })
    debug.steps.push({
      step: 'find_official_admin',
      ok: true,
      found: !!official,
      adminId: official?.id ?? null,
    })

    // Step 4: Try to find by email (legacy)
    const legacyAdmin = await db.user.findFirst({ where: { email: 'admin@cryptomining.io' } })
    debug.steps.push({
      step: 'find_legacy_email_admin',
      ok: true,
      found: !!legacyAdmin,
      adminId: legacyAdmin?.id ?? null,
      phone: legacyAdmin?.phone ?? null,
    })

    // Step 5: Test password comparison
    if (official) {
      const fullOfficial = await db.user.findUnique({ where: { id: official.id } })
      if (fullOfficial) {
        try {
          const matches = await comparePassword('admin123', fullOfficial.passwordHash)
          debug.steps.push({
            step: 'verify_password',
            ok: true,
            matches,
            hashLength: fullOfficial.passwordHash?.length ?? 0,
          })
        } catch (e: any) {
          debug.steps.push({
            step: 'verify_password',
            ok: false,
            error: e.message,
          })
        }
      }
    }
  } catch (e: any) {
    debug.steps.push({
      step: 'error',
      ok: false,
      error: e.message,
      stack: e.stack?.split('\n').slice(0, 5),
    })
  }

  return NextResponse.json(debug, { status: 200 })
}

/**
 * POST /api/debug-admin
 * Force-create or force-reset the official admin account.
 * Body: { action: 'force_create' | 'convert_legacy' | 'list_all' }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  const result: any = { action, timestamp: new Date().toISOString(), steps: [] }

  try {
    if (action === 'force_create') {
      // 1. Delete existing official admin if any
      const existing = await db.user.findFirst({ where: { phone: '773178684' } })
      if (existing) {
        await db.user.delete({ where: { id: existing.id } })
        result.steps.push({ step: 'delete_existing', ok: true, deletedId: existing.id })
      }

      // 2. Create fresh admin
      const passwordHash = await hashPassword('admin123')
      const newAdmin = await db.user.create({
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
      result.steps.push({
        step: 'create_admin',
        ok: true,
        adminId: newAdmin.id,
        phone: newAdmin.phone,
      })

      // 3. Verify password works
      const verify = await comparePassword('admin123', newAdmin.passwordHash)
      result.steps.push({ step: 'verify_password', ok: true, matches: verify })
    } else if (action === 'convert_legacy') {
      // Find legacy email-based admin
      const legacy = await db.user.findFirst({
        where: {
          OR: [
            { email: 'admin@cryptomining.io' },
            { email: 'admin@dexto.local' },
          ],
        },
      })

      if (!legacy) {
        result.steps.push({ step: 'find_legacy', ok: false, error: 'No legacy admin found' })
        return NextResponse.json(result, { status: 404 })
      }

      result.steps.push({ step: 'find_legacy', ok: true, adminId: legacy.id, phone: legacy.phone })

      // Update phone + password
      const passwordHash = await hashPassword('admin123')
      await db.user.update({
        where: { id: legacy.id },
        data: {
          phone: '773178684',
          passwordHash,
          status: 'active',
        },
      })
      result.steps.push({ step: 'update_admin', ok: true })

      // Verify
      const updated = await db.user.findUnique({ where: { id: legacy.id } })
      const verify = await comparePassword('admin123', updated!.passwordHash)
      result.steps.push({ step: 'verify_password', ok: true, matches: verify })
    } else if (action === 'list_all') {
      // List ALL users (not just admins) to see what's in the DB
      const allUsers = await db.user.findMany({
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
        take: 50,
      })
      result.steps.push({
        step: 'list_all_users',
        ok: true,
        count: allUsers.length,
        users: allUsers.map((u) => ({
          id: u.id,
          phone: u.phone,
          phoneType: u.phone === null ? 'null' : u.phone === undefined ? 'undefined' : u.phone === '' ? 'empty' : 'value',
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
        })),
      })
    } else {
      return NextResponse.json({ error: 'invalid_action', validActions: ['force_create', 'convert_legacy', 'list_all'] }, { status: 400 })
    }
  } catch (e: any) {
    result.steps.push({
      step: 'error',
      ok: false,
      error: e.message,
      stack: e.stack?.split('\n').slice(0, 5),
    })
  }

  return NextResponse.json(result, { status: 200 })
}
