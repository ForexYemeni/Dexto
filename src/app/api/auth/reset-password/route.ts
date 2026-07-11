import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// POST /api/auth/reset-password
export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json()

  if (!token || !newPassword) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  // Find user with this token
  const user = await db.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 })
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword)

  // Update password and clear token
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  })

  // Log security event
  await db.securityLog.create({
    data: {
      userId: user.id,
      eventType: 'password_reset',
      details: 'Password reset via email token',
    },
  })

  return NextResponse.json({ success: true, message: 'Password reset successfully' })
}
