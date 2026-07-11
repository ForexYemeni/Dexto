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
        debug: { userFound: false }
      })
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
    const googleScriptUrl = settings?.googleScriptUrl || ''
    const emailSecret = settings?.emailServiceSecret || ''

    // Debug info
    const debug: any = {
      userFound: true,
      userEmail: user.email,
      googleScriptUrlConfigured: googleScriptUrl.length > 10,
      googleScriptUrlLength: googleScriptUrl.length,
    }

    // If Google Script URL is configured, send email
    if (googleScriptUrl && googleScriptUrl.length > 10) {
      try {
        const resetUrl = `${req.nextUrl.origin}/?reset=${token}`
        const subject = 'Dexto - Password Reset'
        const body = `Hello ${user.name},\n\nYou requested a password reset.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\nDexto Team`

        debug.resetUrl = resetUrl
        debug.fetchStarted = true

        const emailResponse = await fetch(googleScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow',
          body: JSON.stringify({
            email: user.email,
            subject,
            body,
            secret: emailSecret,
          }),
        })

        debug.emailResponseStatus = emailResponse.status
        debug.emailResponseOk = emailResponse.ok

        const emailResult = await emailResponse.text()
        debug.emailResponseBody = emailResult.substring(0, 200)

      } catch (e: any) {
        debug.emailError = e.message
        console.error('Email send error:', e)
      }
    } else {
      debug.skipEmail = true
      debug.reason = 'Google Script URL not configured or too short'
    }

    // Always return success (security)
    // But include debug info to help troubleshoot
    return NextResponse.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.',
      debug,
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json({
      success: true, // Still return success for security
      message: 'If the email exists, a reset link has been sent.',
      debug: { fatalError: error.message }
    })
  }
}
