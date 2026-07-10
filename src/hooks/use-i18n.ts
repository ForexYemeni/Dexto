'use client'

import { useUIStore } from '@/lib/store'
import { t as translate, type Locale, type TranslationKey } from '@/lib/i18n'

export function useI18n() {
  const locale = useUIStore((s) => s.locale)
  const setLocale = useUIStore((s) => s.setLocale)
  const toggleLocale = useUIStore((s) => s.toggleLocale)

  const t = (key: TranslationKey): string => translate(locale, key)

  return {
    locale,
    setLocale,
    toggleLocale,
    t,
    isRTL: locale === 'ar',
    dir: locale === 'ar' ? 'rtl' : 'ltr',
  }
}
