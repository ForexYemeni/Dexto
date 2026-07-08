'use client'

import { useState, useEffect } from 'react'
import { useAuthStore, useUIStore } from '@/lib/store'
import { useI18n } from '@/hooks/use-i18n'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Phone, Gift, ShieldCheck, Sparkles, TrendingUp, Globe, Moon, Sun, ArrowRight, ArrowLeft, CheckCircle2, Loader2, Bitcoin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Field } from '@/components/shared/Field'

export default function AuthPage() {
  const { t, locale, toggleLocale, isRTL } = useI18n()
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const setView = useUIStore((s) => s.setView)
  const setUser = useAuthStore((s) => s.setUser)
  const { toast } = useToast()

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Read referral code from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get('ref')
      if (ref) setForm((f) => ({ ...f, referralCode: ref }))
    }
  }, [])

  const validate = () => {
    const e: Record<string, string> = {}
    if (mode === 'register' && !form.name) e.name = t('name')
    if (!form.email) e.email = t('email')
    if (!form.password) e.password = t('password')
    if (mode === 'register') {
      if (form.password !== form.confirmPassword) e.confirmPassword = t('passwordMismatch')
      if (!form.agreeToTerms) e.agreeToTerms = t('mustAgreeTerms')
      if (form.password.length < 6) e.password = t('error')
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const action = mode === 'login' ? 'login' : mode === 'register' ? 'register' : 'forgot'
      const payload: any = { action }
      if (mode === 'login') {
        payload.email = form.email
        payload.password = form.password
      } else if (mode === 'register') {
        Object.assign(payload, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          confirmPassword: form.confirmPassword,
          referralCode: form.referralCode,
          agreeToTerms: form.agreeToTerms,
        })
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorKey = data.error || 'error'
        let msg = errorKey
        if (errorKey === 'invalid_credentials') msg = t('invalidCredentials')
        else if (errorKey === 'email_exists') msg = t('emailExists')
        else if (errorKey === 'password_mismatch') msg = t('passwordMismatch')
        else if (errorKey === 'must_agree_terms') msg = t('mustAgreeTerms')
        else if (errorKey === 'missing_fields') msg = t('error')
        else if (errorKey === 'account_suspended') msg = t('accessDenied')
        else if (errorKey === 'password_too_short') msg = t('error')
        else if (errorKey === 'invalid_referral_code') msg = t('error')

        toast({
          variant: 'destructive',
          title: t('error'),
          description: msg,
        })
        setLoading(false)
        return
      }

      if (data.user) {
        setUser(data.user)
        toast({
          title: mode === 'login' ? t('loginSuccess') : t('registerSuccess'),
          description: `${t('welcomeBack')}, ${data.user.name}`,
        })
        if (data.user.language) {
          useUIStore.getState().setLocale(data.user.language)
        }
        if (data.user.role === 'admin') {
          setView('admin')
        } else {
          setView('dashboard')
        }
      } else {
        toast({ title: t('success') })
        setMode('login')
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('loginFailed'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      {/* Animated background mesh */}
      <div className="absolute inset-0 gradient-mesh opacity-60" />
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Top controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={toggleLocale}
          className="glass rounded-full p-3 hover:bg-white/10 transition-colors"
          aria-label="Toggle language"
        >
          <Globe className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={toggleTheme}
          className="glass rounded-full p-3 hover:bg-white/10 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Language indicator */}
      <div className="absolute top-4 left-4 z-20 glass rounded-full px-4 py-2 text-xs font-medium text-white/80">
        {locale === 'ar' ? '🇸🇦 العربية' : '🇬🇧 English'}
      </div>

      {/* Main auth card */}
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="glass-strong rounded-3xl p-8 shadow-2xl shadow-blue-500/10">
          {/* Logo & branding */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 1 }}
              className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-amber-500 glow-electric"
            >
              <Bitcoin className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {mode === 'login' && t('welcomeBack')}
              {mode === 'register' && t('joinNow')}
              {mode === 'forgot' && t('resetPassword')}
            </h1>
            <p className="text-sm text-white/60">
              {mode === 'login' && t('signInToContinue')}
              {mode === 'register' && t('createAccountToStart')}
              {mode === 'forgot' && t('resetPasswordDesc')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Field
                icon={<User className="w-4 h-4" />}
                placeholder={t('name')}
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                error={errors.name}
                type="text"
                isRTL={isRTL}
              />
            )}

            <Field
              icon={<Mail className="w-4 h-4" />}
              placeholder={t('email')}
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              error={errors.email}
              type="email"
              isRTL={isRTL}
            />

            {mode === 'register' && (
              <Field
                icon={<Phone className="w-4 h-4" />}
                placeholder={`${t('phone')} (${t('optional')})`}
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                type="tel"
                isRTL={isRTL}
              />
            )}

            {mode !== 'forgot' && (
              <div className="relative">
                <Field
                  icon={<Lock className="w-4 h-4" />}
                  placeholder={t('password')}
                  value={form.password}
                  onChange={(v) => setForm({ ...form, password: v })}
                  error={errors.password}
                  type={showPassword ? 'text' : 'password'}
                  isRTL={isRTL}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-white/40 hover:text-white/80 transition-colors`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {mode === 'register' && (
              <>
                <Field
                  icon={<Lock className="w-4 h-4" />}
                  placeholder={t('confirmPassword')}
                  value={form.confirmPassword}
                  onChange={(v) => setForm({ ...form, confirmPassword: v })}
                  error={errors.confirmPassword}
                  type={showPassword ? 'text' : 'password'}
                  isRTL={isRTL}
                />
                <Field
                  icon={<Gift className="w-4 h-4" />}
                  placeholder={`${t('referralCode')} (${t('optional')})`}
                  value={form.referralCode}
                  onChange={(v) => setForm({ ...form, referralCode: v })}
                  type="text"
                  isRTL={isRTL}
                />
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.agreeToTerms}
                      onChange={(e) => setForm({ ...form, agreeToTerms: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${form.agreeToTerms ? 'bg-blue-500 border-blue-500' : 'border-white/30 group-hover:border-white/50'}`}>
                      {form.agreeToTerms && <CheckCircle2 className="w-full h-full text-white p-0.5" />}
                    </div>
                  </div>
                  <span className="text-xs text-white/70">
                    {t('agreeToTerms')}
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <p className="text-xs text-red-400">{errors.agreeToTerms}</p>
                )}
              </>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-white/70">
                  <input type="checkbox" className="rounded border-white/30 bg-transparent" />
                  {t('rememberMe')}
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {t('forgotPassword')}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' && t('login')}
                  {mode === 'register' && t('createAccount')}
                  {mode === 'forgot' && t('sendResetLink')}
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </form>

          {/* Mode switch */}
          {mode !== 'forgot' && (
            <div className="mt-6 text-center text-sm text-white/60">
              {mode === 'login' ? t('dontHaveAccount') : t('alreadyHaveAccount')}{' '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                {mode === 'login' ? t('register') : t('login')}
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mt-6 text-center text-sm text-white/60">
              <button
                onClick={() => setMode('login')}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors inline-flex items-center gap-1"
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                {t('backToLogin')}
              </button>
            </div>
          )}

          {/* Features badges */}
          {mode === 'register' && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <ShieldCheck className="w-5 h-5 mx-auto text-green-400 mb-1" />
                  <p className="text-[10px] text-white/60">{locale === 'ar' ? 'آمن 100%' : '100% Secure'}</p>
                </div>
                <div>
                  <TrendingUp className="w-5 h-5 mx-auto text-blue-400 mb-1" />
                  <p className="text-[10px] text-white/60">{locale === 'ar' ? 'أرباح يومية' : 'Daily Profits'}</p>
                </div>
                <div>
                  <Sparkles className="w-5 h-5 mx-auto text-amber-400 mb-1" />
                  <p className="text-[10px] text-white/60">{locale === 'ar' ? 'فاخر' : 'Premium'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/40 mt-6">
          © 2026 Crypto Mining Investment Platform
        </p>
      </motion.div>
    </div>
  )
}
