import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword, comparePassword } from '@/lib/auth'

// POST /api/auth/change-password
export async function POST(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'same_password' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Verify current password
  const valid = await comparePassword(currentPassword, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'current_password_wrong' }, { status: 400 })
  }

  // Hash and save new password
  const passwordHash = await hashPassword(newPassword)
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  })

  // Log security event
  await db.securityLog.create({
    data: {
      userId: user.id,
      eventType: 'password_change',
      details: 'Password changed from profile settings',
    },
  })

  return NextResponse.json({ success: true, message: 'Password changed successfully' })
}
