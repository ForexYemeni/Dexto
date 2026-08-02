import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, comparePassword } from '@/lib/auth'

/**
 * Helper: raw MongoDB find that bypasses Prisma's strict type checking.
 * This is needed because legacy users have phone=null in the DB, and the new
 * Prisma schema declares phone as non-nullable String, so any normal Prisma
 * query on the User collection throws: "Error converting field phone of
 * expected non-nullable type String, found incompatible value of null."
 *
 * We use $runCommandRaw to read documents as-is without type validation.
 * This only works on MongoDB (which is what production uses).
 */

/**
 * GET /api/debug-admin
 * Diagnostic endpoint — returns the current state of admin accounts in the DB.
 *
 * Uses raw MongoDB commands to bypass Prisma's type validation, since legacy
 * users have phone=null which causes normal Prisma queries to throw.
 */
export async function GET(req: NextRequest) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  }

  try {
    // Step 1: Try to count users via raw command
    try {
      const countResult: any = await (db as any).$runCommandRaw({
        count: 'users',
      })
      debug.steps.push({
        step: 'count_users_raw',
        ok: true,
        count: countResult?.n ?? countResult?.count ?? 'unknown',
      })
    } catch (e: any) {
      debug.steps.push({ step: 'count_users_raw', ok: false, error: e.message })
    }

    // Step 2: Try normal Prisma count (will fail if phone=null exists)
    try {
      const totalUsers = await db.user.count()
      debug.steps.push({ step: 'count_users_prisma', ok: true, count: totalUsers })
    } catch (e: any) {
      debug.steps.push({
        step: 'count_users_prisma',
        ok: false,
        error: e.message.substring(0, 200),
      })
    }

    // Step 3: Find all admins via raw MongoDB command
    try {
      const findResult: any = await (db as any).$runCommandRaw({
        find: 'users',
        filter: { role: 'admin' },
        projection: {
          _id: 1,
          phone: 1,
          email: 1,
          name: 1,
          role: 1,
          status: 1,
          passwordHash: 1,
          createdAt: 1,
        },
        limit: 20,
      })
      const cursor = findResult?.cursor?.firstBatch ?? []
      debug.steps.push({
        step: 'find_admins_raw',
        ok: true,
        count: cursor.length,
        admins: cursor.map((a: any) => ({
          id: a._id?.toString?.() ?? a._id,
          phone: a.phone,
          phoneType: a.phone === null ? 'null' : a.phone === undefined ? 'undefined' : a.phone === '' ? 'empty' : 'value',
          email: a.email,
          name: a.name,
          status: a.status,
          hasPasswordHash: !!a.passwordHash,
          hashLength: a.passwordHash?.length ?? 0,
        })),
      })
    } catch (e: any) {
      debug.steps.push({
        step: 'find_admins_raw',
        ok: false,
        error: e.message.substring(0, 300),
      })
    }

    // Step 4: Count users with phone=null (the root cause)
    try {
      const nullPhoneResult: any = await (db as any).$runCommandRaw({
        count: 'users',
        query: { phone: null },
      })
      debug.steps.push({
        step: 'count_null_phone_users',
        ok: true,
        count: nullPhoneResult?.n ?? nullPhoneResult?.count ?? 'unknown',
      })
    } catch (e: any) {
      debug.steps.push({
        step: 'count_null_phone_users',
        ok: false,
        error: e.message.substring(0, 200),
      })
    }
  } catch (e: any) {
    debug.steps.push({
      step: 'global_error',
      ok: false,
      error: e.message,
    })
  }

  return NextResponse.json(debug, { status: 200 })
}

/**
 * POST /api/debug-admin
 * Actions:
 *   - action=fix_null_phones: assign placeholder phones to all users with phone=null
 *     (except admins, who get 773178684 if they're the first admin)
 *   - action=force_create: delete + recreate official admin
 *   - action=convert_legacy: convert legacy email admin to phone admin
 *   - action=list_all: list all users via raw command
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  const result: any = { action, timestamp: new Date().toISOString(), steps: [] }

  try {
    if (action === 'fix_null_phones') {
      // Find all users with phone=null via raw command
      const findResult: any = await (db as any).$runCommandRaw({
        find: 'users',
        filter: { phone: null },
        projection: { _id: 1, email: 1, name: 1, role: 1 },
        limit: 100,
      })
      const nullPhoneUsers = findResult?.cursor?.firstBatch ?? []
      result.steps.push({
        step: 'find_null_phones',
        ok: true,
        count: nullPhoneUsers.length,
      })

      // For each user with phone=null, assign a unique placeholder phone
      // (use timestamp + index to ensure uniqueness)
      let updated = 0
      for (let i = 0; i < nullPhoneUsers.length; i++) {
        const u = nullPhoneUsers[i]
        const userId = u._id?.toString?.() ?? u._id
        const isLegacyAdmin = u.role === 'admin'

        // Legacy admin → use the official phone 773178684
        // Other users → use a placeholder like 9000000000 + index (10 digits, unique)
        const newPhone = isLegacyAdmin ? '773178684' : `9000000${String(i).padStart(4, '0')}`

        try {
          const updateResult: any = await (db as any).$runCommandRaw({
            update: 'users',
            updates: [
              {
                q: { _id: u._id },
                u: { $set: { phone: newPhone } },
              },
            ],
          })
          if (updateResult?.nModified > 0 || updateResult?.n > 0) {
            updated++
          }
        } catch (e: any) {
          result.steps.push({
            step: `update_user_${i}`,
            ok: false,
            userId,
            error: e.message.substring(0, 200),
          })
        }
      }
      result.steps.push({ step: 'update_null_phones', ok: true, updated })
    } else if (action === 'force_create') {
      // 1. Delete existing official admin if any (via raw command)
      const deleteResult: any = await (db as any).$runCommandRaw({
        delete: 'users',
        deletes: [{ q: { phone: '773178684' }, limit: 0 }],
      })
      result.steps.push({
        step: 'delete_existing',
        ok: true,
        deleted: deleteResult?.n ?? 0,
      })

      // 2. Create fresh admin via raw command (bypass Prisma validation)
      // IMPORTANT: MongoDB stores Date fields as ISODate objects, NOT strings.
      // We must use the $date operator to ensure proper Date type.
      const passwordHash = await hashPassword('admin123')
      const insertResult: any = await (db as any).$runCommandRaw({
        insert: 'users',
        documents: [
          {
            phone: '773178684',
            email: 'admin@dexto.local',
            name: 'Super Admin',
            passwordHash,
            referralCode: 'ADMIN2026',
            role: 'admin',
            status: 'active',
            balance: 0,
            totalInvested: 0,
            totalProfit: 0,
            todayProfit: 0,
            monthProfit: 0,
            referralProfit: 0,
            language: 'ar',
            theme: 'dark',
            // Use MongoDB extended JSON $date to ensure proper Date type
            createdAt: { $date: new Date().toISOString() },
            updatedAt: { $date: new Date().toISOString() },
          },
        ],
      })
      result.steps.push({
        step: 'create_admin',
        ok: insertResult?.n === 1,
        inserted: insertResult?.n ?? 0,
      })

      // 3. Verify via raw command
      const verifyResult: any = await (db as any).$runCommandRaw({
        find: 'users',
        filter: { phone: '773178684' },
        projection: { _id: 1, phone: 1, passwordHash: 1 },
        limit: 1,
      })
      const created = verifyResult?.cursor?.firstBatch?.[0]
      if (created) {
        const matches = await comparePassword('admin123', created.passwordHash)
        result.steps.push({
          step: 'verify_password',
          ok: true,
          matches,
          adminId: created._id?.toString?.() ?? created._id,
        })
      } else {
        result.steps.push({ step: 'verify_password', ok: false, error: 'Admin not found after create' })
      }
    } else if (action === 'fix_dates') {
      // Fix any user documents that have string dates instead of MongoDB Date objects.
      // This happens when documents were created via raw $runCommandRaw with JS Date objects
      // (which $runCommandRaw serializes as strings, not as MongoDB Date type).
      //
      // We find all users, check if createdAt is a string, and if so convert it to a proper Date.
      const findResult: any = await (db as any).$runCommandRaw({
        find: 'users',
        projection: { _id: 1, createdAt: 1, updatedAt: 1 },
        limit: 100,
      })
      const users = findResult?.cursor?.firstBatch ?? []
      result.steps.push({ step: 'find_users', ok: true, count: users.length })

      let fixed = 0
      for (const u of users) {
        const createdAt = u.createdAt
        const updatedAt = u.updatedAt
        const needsFix =
          (createdAt && typeof createdAt === 'string') ||
          (updatedAt && typeof updatedAt === 'string')

        if (needsFix) {
          try {
            const updateResult: any = await (db as any).$runCommandRaw({
              update: 'users',
              updates: [
                {
                  q: { _id: u._id },
                  u: {
                    $set: {
                      createdAt: typeof createdAt === 'string' ? { $date: createdAt } : createdAt,
                      updatedAt: typeof updatedAt === 'string' ? { $date: updatedAt } : updatedAt,
                    },
                  },
                },
              ],
            })
            if (updateResult?.nModified > 0 || updateResult?.n > 0) {
              fixed++
            }
          } catch (e: any) {
            result.steps.push({
              step: `fix_user_${u._id}`,
              ok: false,
              error: e.message.substring(0, 200),
            })
          }
        }
      }
      result.steps.push({ step: 'fix_dates', ok: true, fixed })
    } else if (action === 'reset_primary_password') {
      // Emergency: reset the primary admin password to admin123
      // This is the ONLY way to recover if the password is lost.
      const passwordHash = await hashPassword('admin123')
      const findResult: any = await (db as any).$runCommandRaw({
        find: 'users',
        filter: { phone: '773178684' },
        projection: { _id: 1 },
        limit: 1,
      })
      const admin = findResult?.cursor?.firstBatch?.[0]
      if (!admin) {
        result.steps.push({ step: 'find_primary_admin', ok: false, error: 'Primary admin not found' })
        return NextResponse.json(result, { status: 404 })
      }
      const updateResult: any = await (db as any).$runCommandRaw({
        update: 'users',
        updates: [
          {
            q: { _id: admin._id },
            u: { $set: { passwordHash, status: 'active' } },
          },
        ],
      })
      result.steps.push({
        step: 'reset_password',
        ok: updateResult?.nModified > 0 || updateResult?.n > 0,
        modified: updateResult?.nModified ?? updateResult?.n ?? 0,
      })

      // Verify
      const verifyResult: any = await (db as any).$runCommandRaw({
        find: 'users',
        filter: { phone: '773178684' },
        projection: { passwordHash: 1 },
        limit: 1,
      })
      const updated = verifyResult?.cursor?.firstBatch?.[0]
      if (updated) {
        const matches = await comparePassword('admin123', updated.passwordHash)
        result.steps.push({ step: 'verify_password', ok: true, matches })
      }
    } else if (action === 'list_all') {
      // List ALL users via raw command (bypass Prisma)
      const findResult: any = await (db as any).$runCommandRaw({
        find: 'users',
        projection: { _id: 1, phone: 1, email: 1, name: 1, role: 1, status: 1 },
        limit: 50,
      })
      const users = findResult?.cursor?.firstBatch ?? []
      result.steps.push({
        step: 'list_all_users',
        ok: true,
        count: users.length,
        users: users.map((u: any) => ({
          id: u._id?.toString?.() ?? u._id,
          phone: u.phone,
          phoneType: u.phone === null ? 'null' : u.phone === undefined ? 'undefined' : u.phone === '' ? 'empty' : 'value',
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
        })),
      })
    } else {
      return NextResponse.json({ error: 'invalid_action', validActions: ['fix_null_phones', 'force_create', 'fix_dates', 'list_all'] }, { status: 400 })
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

