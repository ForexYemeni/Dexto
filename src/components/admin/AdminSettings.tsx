'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function AdminSettings() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [settings, setSettings] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
