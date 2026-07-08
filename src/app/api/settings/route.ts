import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings - public settings (no auth needed)
export async function GET(req: NextRequest) {
  const settings = await db.systemSetting.findFirst()

  if (!settings) {
    return NextResponse.json({
      platformName: 'Crypto Mining Investment Platform',
      platformNameAr: 'منصة التعدين والاستثمار للعملات الرقمية',
      primaryColor: '#3B82F6',
      accentColor: '#A855F7',
      defaultLanguage: 'ar',
      supportEmail: 'support@cryptomining.io',
      supportPhone: '',
      supportTelegram: '',
      maintenanceMode: false,
      maintenanceMessage: '',
      footerText: '© 2026 Crypto Mining Investment Platform',
      footerTextAr: '© 2026 منصة التعدين والاستثمار للعملات الرقمية',
      termsContent: '',
      termsContentAr: '',
      privacyContent: '',
      privacyContentAr: '',
      faqContent: '[]',
      faqContentAr: '[]',
    })
  }

  return NextResponse.json({
    platformName: settings.platformName,
    platformNameAr: settings.platformNameAr,
    logo: settings.logo,
    primaryColor: settings.primaryColor,
    accentColor: settings.accentColor,
    defaultLanguage: settings.defaultLanguage,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    supportTelegram: settings.supportTelegram,
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    footerText: settings.footerText,
    footerTextAr: settings.footerTextAr,
    termsContent: settings.termsContent,
    termsContentAr: settings.termsContentAr,
    privacyContent: settings.privacyContent,
    privacyContentAr: settings.privacyContentAr,
    faqContent: settings.faqContent,
    faqContentAr: settings.faqContentAr,
    minDeposit: settings.minDeposit,
    minWithdrawal: settings.minWithdrawal,
    withdrawalFee: settings.withdrawalFee,
  })
}
