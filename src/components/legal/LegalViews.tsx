'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion } from 'framer-motion'
import {
  HelpCircle, FileText, ShieldCheck, User, Globe, Moon, Sun,
  Mail, Phone, Lock, Loader2, Check,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useUIStore, useAuthStore } from '@/lib/store'

interface Settings {
  faqContent: string
  faqContentAr: string
  termsContent: string
  termsContentAr: string
  privacyContent: string
  privacyContentAr: string
}

export function LegalView({ type }: { type: 'faq' | 'terms' | 'privacy' }) {
  const { t, locale, isRTL } = useI18n()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: Settings) => {
        if (type === 'faq') {
          const raw = locale === 'ar' ? data.faqContentAr : data.faqContent
          try {
            const parsed = JSON.parse(raw || '[]')
            setContent(parsed)
          } catch {
            setContent([])
          }
        } else if (type === 'terms') {
          setContent(locale === 'ar' ? data.termsContentAr : data.termsContent)
        } else if (type === 'privacy') {
          setContent(locale === 'ar' ? data.privacyContentAr : data.privacyContent)
        }
      })
      .finally(() => setLoading(false))
  }, [type, locale])

  const titles = {
    faq: t('faq'),
    terms: t('terms'),
    privacy: t('privacy'),
  }
  const descs = {
    faq: t('faqDesc'),
    terms: t('termsDesc'),
    privacy: t('privacyDesc'),
  }
  const icons = {
    faq: <HelpCircle className="w-6 h-6" />,
    terms: <FileText className="w-6 h-6" />,
    privacy: <ShieldCheck className="w-6 h-6" />,
  }

  if (loading) {
    return <div className="h-96 glass rounded-2xl animate-pulse" />
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
            {icons[type]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{titles[type]}</h1>
            <p className="text-xs text-white/40">{descs[type]}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        {type === 'faq' ? (
          <div className="space-y-3">
            {(content as any[]).map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4"
              >
                <p className="text-sm font-semibold text-white mb-2 flex items-start gap-2">
                  <span className="text-blue-400">Q:</span>
                  {item.q}
                </p>
                <p className="text-xs text-white/60 leading-relaxed flex items-start gap-2">
                  <span className="text-green-400">A:</span>
                  {item.a}
                </p>
              </motion.div>
            ))}
            {(content as any[]).length === 0 && (
              <p className="text-center text-sm text-white/40 py-8">{t('noData')}</p>
            )}
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
              {content || t('noData')}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export function ProfileView() {
  const { t, locale, setLocale, isRTL } = useI18n()
  const { user, updateUser } = useAuthStore()
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    language: locale,
    theme,
  })

  useEffect(() => {
    // Fetch user profile
    fetch('/api/auth', { method: 'GET' })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setForm({
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            language: data.user.language || 'ar',
            theme: data.user.theme || 'dark',
          })
        }
      })
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      // Update language & theme in UI store
      setLocale(form.language as any)
      setTheme(form.theme as any)
      updateUser({
        name: form.name,
        language: form.language as any,
      })
      toast({ variant: 'success', title: '✅ ' + t('settingsSaved') })
    } catch (e) {
      toast({ variant: 'destructive', title: '❌ ' + t('error') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-amber-500 flex items-center justify-center text-3xl font-bold text-white">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user?.name}</h1>
            <p className="text-xs text-white/40">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
              {user?.role === 'admin' ? (locale === 'ar' ? 'مشرف' : 'Admin') : (locale === 'ar' ? 'مستخدم' : 'User')}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Personal info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            {t('myProfile')}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">{t('name')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">{t('email')}</label>
              <input
                type="email"
                value={form.email}
                disabled
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white/50 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">{t('phone')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={locale === 'ar' ? 'رقم الهاتف' : 'Phone number'}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
        </motion.div>

        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-400" />
            {t('accountSettings')}
          </h3>

          <div className="space-y-4">
            {/* Language */}
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">{t('language')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setForm({ ...form, language: 'ar' })}
                  className={`py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                    form.language === 'ar'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'glass text-white/60'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  العربية
                </button>
                <button
                  onClick={() => setForm({ ...form, language: 'en' })}
                  className={`py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                    form.language === 'en'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'glass text-white/60'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  English
                </button>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">{t('theme')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setForm({ ...form, theme: 'dark' })}
                  className={`py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                    form.theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'glass text-white/60'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  {t('darkMode')}
                </button>
                <button
                  onClick={() => setForm({ ...form, theme: 'light' })}
                  className={`py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                    form.theme === 'light'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'glass text-white/60'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  {t('lightMode')}
                </button>
              </div>
            </div>

            {/* Referral code */}
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">{t('referralCode')}</label>
              <input
                type="text"
                value={user?.referralCode || ''}
                disabled
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-mono"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              {t('save')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function Settings({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
