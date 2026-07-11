import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 })
  }

  try {
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })

    // For security: always return success (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      })
    }

    // Generate reset token
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

    const resetUrl = `${req.nextUrl.origin}/?reset=${token}`

    // Get settings for Google Script URL
    const settings = await db.systemSetting.findFirst()
    const googleScriptUrl = settings?.googleScriptUrl || ''

    let emailSent = false
    let emailError = ''

    // If Google Script URL is configured, try to send email
    if (googleScriptUrl && googleScriptUrl.length > 10) {
      try {
        const subject = 'Dexto - Password Reset'
        const body = `Hello ${user.name},\n\nYou requested a password reset.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\nDexto Team`

        const emailResponse = await fetch(googleScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            email: user.email,
            subject,
            body,
          }),
        })

        if (emailResponse.ok) {
          emailSent = true
        } else {
          emailError = `HTTP ${emailResponse.status}`
        }
      } catch (e: any) {
        emailError = e.message
      }
    }

    // Always return success + reset link (for cases where email fails)
    // The reset link allows the user to reset password directly
    return NextResponse.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.',
      emailSent,
      emailError: emailError || undefined,
      // Always include resetUrl - frontend will show it if email failed
      resetUrl: emailSent ? undefined : resetUrl,
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.',
    })
  }
}
