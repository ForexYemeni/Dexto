import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })

  // For security: always return success (don't reveal if email exists)
  if (!user) {
    return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent.' })
  }

  // Generate reset token (random string)
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  // Save token to user
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpires: expires,
    },
  })

  // Get settings for Google Script URL
  const settings = await db.systemSetting.findFirst()

  // If Google Script URL is configured, send email
  if (settings?.googleScriptUrl && settings.googleScriptUrl.length > 10) {
    try {
      const resetUrl = `${req.nextUrl.origin}/?reset=${token}`
      const subject = 'Dexto - Password Reset'
      const body = `Hello ${user.name},\n\nYou requested a password reset.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\nDexto Team`

      await fetch(settings.googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          subject,
          body,
          secret: settings.emailServiceSecret || '',
        }),
      })
    } catch (e) {
      console.error('Email send error (non-fatal):', e)
    }
  }

  // Always return success (security)
  return NextResponse.json({
    success: true,
    message: 'If the email exists, a reset link has been sent.',
    // In development: return token for testing
    ...(process.env.NODE_ENV === 'development' && { devToken: token }),
  })
}
