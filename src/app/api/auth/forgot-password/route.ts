import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Resend } from 'resend'

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

    let emailSent = false
    let emailError = ''

    // Try Resend first (professional email service)
    const resendApiKey = process.env.RESEND_API_KEY

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)

        const htmlContent = `
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0;padding:0;background:#0a0a1a;font-family:Arial,sans-serif">
            <div style="max-width:500px;margin:0 auto;background:#0f1428;border-radius:20px;overflow:hidden;border:1px solid rgba(59,130,246,0.2)">
              <div style="background:linear-gradient(135deg,#3B82F6,#A855F7);padding:30px;text-align:center">
                <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">Dexto</h1>
                <p style="margin:5px 0 0;color:rgba(255,255,255,0.8);font-size:13px">منصة التعدين والاستثمار</p>
              </div>
              <div style="padding:35px 30px">
                <h2 style="color:#fff;font-size:18px;margin:0 0 20px">إعادة تعيين كلمة المرور</h2>
                <div style="color:rgba(255,255,255,0.8);font-size:15px;line-height:1.8">
                  مرحباً ${user.name},<br><br>
                  لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.<br>
                  اضغط على الزر أدناه لإعادة تعيين كلمة المرور:
                </div>
                <div style="text-align:center;margin:30px 0">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3B82F6,#A855F7);color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:16px">إعادة تعيين كلمة المرور</a>
                </div>
                <p style="text-align:center;color:rgba(255,255,255,0.4);font-size:12px;word-break:break-all">
                  أو انسخ الرابط: <br>${resetUrl}
                </p>
                <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:15px;margin-top:25px">
                  <p style="margin:0;color:rgba(245,158,11,0.9);font-size:13px">⚠️ هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة.</p>
                </div>
              </div>
              <div style="padding:25px;background:rgba(0,0,0,0.2);text-align:center">
                <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px">© 2026 Dexto Platform - جميع الحقوق محفوظة<br>هذه رسالة تلقائية، يرجى عدم الرد عليها</p>
              </div>
            </div>
          </body>
          </html>
        `

        const { data: resendData, error: resendError } = await resend.emails.send({
          from: 'Dexto Platform <onboarding@resend.dev>',
          to: [user.email],
          subject: 'Dexto - إعادة تعيين كلمة المرور',
          html: htmlContent,
        })

        if (resendError) {
          emailError = resendError.message
          console.error('Resend error:', resendError)
        } else {
          emailSent = true
        }
      } catch (e: any) {
        emailError = e.message
        console.error('Resend exception:', e)
      }
    }

    // Fallback: Try Google Script if Resend failed
    if (!emailSent) {
      const settings = await db.systemSetting.findFirst()
      const googleScriptUrl = settings?.googleScriptUrl || ''

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
            emailError = `Google Script HTTP ${emailResponse.status}`
          }
        } catch (e: any) {
          emailError = e.message
        }
      }
    }

    // Return response
    return NextResponse.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.',
      emailSent,
      emailError: emailError || undefined,
      resetUrl: emailSent ? undefined : resetUrl, // Only show URL if email failed
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.',
    })
  }
}
