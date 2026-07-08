'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, Loader2, ShieldAlert, KeyRound, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore, useUIStore } from '@/lib/store'

export function AdminSettings() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [settings, setSettings] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Admin credentials state
  const [credForm, setCredForm] = useState({
    currentPassword: '',
    newEmail: '',
    newPassword: '',
  })
  const [savingCred, setSavingCred] = useState(false)

  useEffect(() => {
    fetch('/api/admin?section=settings')
      .then((r) => r.json())
      .then((data) => setSettings(data.settings))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_settings', settings }),
      })
      if (res.ok) {
        toast({ title: t('settingsSaved') })
      }
    } catch {
      toast({ variant: 'destructive', title: t('error') })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCredentials = async () => {
    if (!credForm.currentPassword) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: locale === 'ar' ? 'يرجى إدخال كلمة المرور الحالية' : 'Please enter current password',
      })
      return
    }
    if (!credForm.newEmail && !credForm.newPassword) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: locale === 'ar' ? 'يرجى إدخال بريد جديد أو كلمة مرور جديدة' : 'Please enter new email or new password',
      })
      return
    }

    setSavingCred(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_admin_credentials',
          currentPassword: credForm.currentPassword,
          newEmail: credForm.newEmail,
          newPassword: credForm.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMap: Record<string, string> = {
          current_password_wrong: locale === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect',
          current_password_required: locale === 'ar' ? 'كلمة المرور الحالية مطلوبة' : 'Current password is required',
          email_already_used: locale === 'ar' ? 'البريد الإلكتروني مستخدم بالفعل' : 'Email already in use',
          password_too_short: locale === 'ar' ? 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)' : 'Password too short (min 6 chars)',
          no_changes: locale === 'ar' ? 'لا توجد تغييرات' : 'No changes to apply',
        }
        toast({
          variant: 'destructive',
          title: t('error'),
          description: errMap[data.error] || t('error'),
        })
        return
      }

      toast({
        title: locale === 'ar' ? 'تم تحديث البيانات بنجاح' : 'Credentials updated successfully',
        description: locale === 'ar' ? 'يرجى تسجيل الدخول مجدداً بالبيانات الجديدة' : 'Please login again with new credentials',
      })

      // Logout and redirect to login
      setTimeout(() => {
        useAuthStore.getState().logout()
        useUIStore.getState().setView('login')
        window.location.reload()
      }, 2000)
    } catch {
      toast({ variant: 'destructive', title: t('error') })
    } finally {
      setSavingCred(false)
    }
  }

  if (loading || !settings) {
    return <div className="h-96 glass rounded-2xl animate-pulse" />
  }

  const update = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-400" />
          {t('platformSettings')}
        </h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('saveSettings')}
        </button>
      </div>

      {/* Branding */}
      <SettingsSection title={t('branding')}>
        <SettingField label={`${t('platformName')} (EN)`} value={settings.platformName} onChange={(v) => update('platformName', v)} />
        <SettingField label={`${t('platformName')} (AR)`} value={settings.platformNameAr} onChange={(v) => update('platformNameAr', v)} />
        <div className="grid grid-cols-2 gap-3">
          <SettingField label={t('primaryColor')} type="color" value={settings.primaryColor} onChange={(v) => update('primaryColor', v)} />
          <SettingField label={t('accentColor')} type="color" value={settings.accentColor} onChange={(v) => update('accentColor', v)} />
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1.5 block">{t('defaultLanguage')}</label>
          <select
            value={settings.defaultLanguage}
            onChange={(e) => update('defaultLanguage', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm"
          >
            <option value="ar" className="bg-slate-900">العربية</option>
            <option value="en" className="bg-slate-900">English</option>
          </select>
        </div>
      </SettingsSection>

      {/* Mining settings */}
      <SettingsSection title={t('miningSettings')}>
        <SettingField label={`${t('duration')} (${t('hours')})`} type="number" value={settings.globalMiningDuration.toString()} onChange={(v) => update('globalMiningDuration', Number(v))} />
        <SettingField label={`${t('dailyProfitRate')} (default %)`} type="number" value={(settings.globalMiningProfitRate * 100).toString()} onChange={(v) => update('globalMiningProfitRate', Number(v) / 100)} />
      </SettingsSection>

      {/* Deposit settings */}
      <SettingsSection title={t('depositSettings')}>
        <SettingField label={`${t('minDeposit')} (USDT)`} type="number" value={settings.minDeposit.toString()} onChange={(v) => update('minDeposit', Number(v))} />
        <label className="flex items-center gap-2 text-white text-sm">
          <input
            type="checkbox"
            checked={settings.autoApproveDeposit}
            onChange={(e) => update('autoApproveDeposit', e.target.checked)}
            className="rounded"
          />
          {locale === 'ar' ? 'الموافقة التلقائية على الإيداعات' : 'Auto-approve deposits'}
        </label>
      </SettingsSection>

      {/* Withdrawal settings */}
      <SettingsSection title={t('withdrawalSettings')}>
        <SettingField label={`${t('minWithdrawal')} (USDT)`} type="number" value={settings.minWithdrawal.toString()} onChange={(v) => update('minWithdrawal', Number(v))} />
        <SettingField label={`${t('withdrawalFee')}`} type="number" value={settings.withdrawalFee.toString()} onChange={(v) => update('withdrawalFee', Number(v))} />
        <div>
          <label className="text-xs text-white/60 mb-1.5 block">{locale === 'ar' ? 'نوع الرسوم' : 'Fee Type'}</label>
          <select
            value={settings.withdrawalFeeType}
            onChange={(e) => update('withdrawalFeeType', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm"
          >
            <option value="percent" className="bg-slate-900">{locale === 'ar' ? 'نسبة مئوية %' : 'Percent (%)'}</option>
            <option value="fixed" className="bg-slate-900">{locale === 'ar' ? 'مبلغ ثابت' : 'Fixed amount'}</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-white text-sm">
          <input
            type="checkbox"
            checked={settings.autoApproveWithdrawal}
            onChange={(e) => update('autoApproveWithdrawal', e.target.checked)}
            className="rounded"
          />
          {locale === 'ar' ? 'الموافقة التلقائية على السحوبات' : 'Auto-approve withdrawals'}
        </label>
      </SettingsSection>

      {/* Referral settings */}
      <SettingsSection title={t('referralSettings')}>
        <div className="grid grid-cols-3 gap-3">
          <SettingField label={`${t('level1')} (%)`} type="number" value={(settings.referralLevel1 * 100).toString()} onChange={(v) => update('referralLevel1', Number(v) / 100)} />
          <SettingField label={`${t('level2')} (%)`} type="number" value={(settings.referralLevel2 * 100).toString()} onChange={(v) => update('referralLevel2', Number(v) / 100)} />
          <SettingField label={`${t('level3')} (%)`} type="number" value={(settings.referralLevel3 * 100).toString()} onChange={(v) => update('referralLevel3', Number(v) / 100)} />
        </div>
      </SettingsSection>

      {/* Support settings */}
      <SettingsSection title={t('supportSettings')}>
        <SettingField label={t('supportEmail')} value={settings.supportEmail} onChange={(v) => update('supportEmail', v)} />
        <SettingField label={t('supportPhone')} value={settings.supportPhone} onChange={(v) => update('supportPhone', v)} />
        <SettingField label={t('supportTelegram')} value={settings.supportTelegram} onChange={(v) => update('supportTelegram', v)} />
      </SettingsSection>

      {/* Admin Account - Change Email & Password */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 border border-red-500/20"
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <h3 className="text-base font-semibold text-white">
            {locale === 'ar' ? 'حساب الإدارة' : 'Admin Account'}
          </h3>
        </div>
        <p className="text-xs text-white/40 mb-4">
          {locale === 'ar'
            ? 'تغيير البريد الإلكتروني وكلمة المرور الخاصة بالإدارة. سيتم حذف البيانات القديمة نهائياً ويجب تسجيل الدخول مجدداً.'
            : 'Change admin email and password. Old credentials will be permanently deleted and you must login again.'}
        </p>

        <div className="space-y-3">
          {/* Current password (required for security) */}
          <div>
            <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
              <KeyRound className="w-3 h-3" />
              {locale === 'ar' ? 'كلمة المرور الحالية (مطلوبة للتأكيد)' : 'Current Password (required for confirmation)'}
            </label>
            <input
              type="password"
              value={credForm.currentPassword}
              onChange={(e) => setCredForm({ ...credForm, currentPassword: e.target.value })}
              placeholder={locale === 'ar' ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
              className="w-full bg-white/5 border border-red-500/20 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-red-500/50"
            />
          </div>

          {/* New email */}
          <div>
            <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {locale === 'ar' ? 'البريد الإلكتروني الجديد' : 'New Email'}
            </label>
            <input
              type="email"
              value={credForm.newEmail}
              onChange={(e) => setCredForm({ ...credForm, newEmail: e.target.value })}
              placeholder={locale === 'ar' ? 'البريد الجديد (اتركه فارغاً لعدم التغيير)' : 'New email (leave empty to keep current)'}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* New password */}
          <div>
            <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
              <KeyRound className="w-3 h-3" />
              {locale === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <input
              type="password"
              value={credForm.newPassword}
              onChange={(e) => setCredForm({ ...credForm, newPassword: e.target.value })}
              placeholder={locale === 'ar' ? 'كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)' : 'New password (leave empty to keep current)'}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
            <p className="text-[10px] text-white/40 mt-1">
              {locale === 'ar' ? '6 أحرف على الأقل' : 'Minimum 6 characters'}
            </p>
          </div>

          {/* Warning box */}
          <div className="glass rounded-xl p-3 bg-red-500/5 border border-red-500/20 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/60 leading-relaxed">
              {locale === 'ar'
                ? 'تحذير: سيتم استبدال البريد وكلمة المرور القديمة نهائياً. بعد الحفظ سيتم تسجيل خروجك تلقائياً ويجب تسجيل الدخول بالبيانات الجديدة.'
                : 'Warning: Old email and password will be permanently replaced. After saving, you will be automatically logged out and must login with the new credentials.'}
            </p>
          </div>

          {/* Save button */}
          <button
            onClick={handleUpdateCredentials}
            disabled={savingCred}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform"
          >
            {savingCred ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث بيانات الإدارة' : 'Update Admin Credentials'}
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Maintenance */}
      <SettingsSection title={t('maintenance')}>
        <label className="flex items-center gap-2 text-white text-sm">
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) => update('maintenanceMode', e.target.checked)}
            className="rounded"
          />
          {t('maintenanceMode')}
        </label>
        <SettingField label={t('maintenanceMessage')} value={settings.maintenanceMessage} onChange={(v) => update('maintenanceMessage', v)} textarea />
      </SettingsSection>

      {/* Legal content */}
      <SettingsSection title={locale === 'ar' ? 'المحتوى القانوني' : 'Legal Content'}>
        <SettingField label={`${t('terms')} (EN)`} value={settings.termsContent} onChange={(v) => update('termsContent', v)} textarea />
        <SettingField label={`${t('terms')} (AR)`} value={settings.termsContentAr} onChange={(v) => update('termsContentAr', v)} textarea />
        <SettingField label={`${t('privacy')} (EN)`} value={settings.privacyContent} onChange={(v) => update('privacyContent', v)} textarea />
        <SettingField label={`${t('privacy')} (AR)`} value={settings.privacyContentAr} onChange={(v) => update('privacyContentAr', v)} textarea />
      </SettingsSection>

      {/* Save button at bottom */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('saveSettings')}
        </button>
      </div>
    </div>
  )
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6"
    >
      <h3 className="text-base font-semibold text-white mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </motion.div>
  )
}

function SettingField({ label, value, onChange, type = 'text', textarea = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="text-xs text-white/60 mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm resize-none focus:outline-none focus:border-blue-500/50"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50 ${type === 'color' ? 'h-12 p-1' : ''}`}
        />
      )}
    </div>
  )
}
