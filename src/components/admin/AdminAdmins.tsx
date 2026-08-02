'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, UserPlus, Phone, KeyRound, Trash2, Power, Loader2,
  X, CheckCircle2, Lock, Crown, AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/time-utils'

interface Admin {
  id: string
  phone: string
  email: string | null
  name: string
  status: string
  language: string
  lastLoginAt: string | null
  createdAt: string
  referralCode: string
  allowedTabs?: string | null
}

export function AdminAdmins() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [resetTarget, setResetTarget] = useState<Admin | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState(false)
  // allowedTabs: null = full access, string[] = restricted to those tabs only
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    password: '',
    fullAccess: true,
    allowedTabs: [] as string[],
  })
  const [editTabsTarget, setEditTabsTarget] = useState<Admin | null>(null)
  const [editTabsForm, setEditTabsForm] = useState({
    fullAccess: true,
    allowedTabs: [] as string[],
  })
  const [updatingTabs, setUpdatingTabs] = useState(false)

  // Available tabs for the access-control picker
  const AVAILABLE_TABS = [
    { key: 'dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard' },
    { key: 'users', labelAr: 'إدارة المستخدمين', labelEn: 'Users' },
    { key: 'admins', labelAr: 'إدارة المدراء', labelEn: 'Admins' },
    { key: 'plans', labelAr: 'إدارة التعدين', labelEn: 'Mining Plans' },
    { key: 'payments', labelAr: 'إدارة المدفوعات', labelEn: 'Payments' },
    { key: 'wallets', labelAr: 'الشبكات', labelEn: 'Networks' },
    { key: 'tickets', labelAr: 'تذاكر الدعم', labelEn: 'Support Tickets' },
    { key: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings' },
    { key: 'logs', labelAr: 'سجلات الأمان', labelEn: 'Security Logs' },
  ]

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin?section=admins', { cache: 'no-store' })
      const data = await res.json()
      setAdmins(data.admins || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const handleCreate = async () => {
    if (!createForm.name || !createForm.phone || !createForm.password) {
      toast({
        variant: 'destructive',
        title: '❌ ' + t('error'),
        description: locale === 'ar' ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields',
      })
      return
    }
    if (createForm.password.length < 6) {
      toast({
        variant: 'destructive',
        title: '❌ ' + t('error'),
        description: locale === 'ar' ? 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)' : 'Password too short (min 6 chars)',
      })
      return
    }
    const digits = createForm.phone.replace(/[^0-9]/g, '')
    if (!/^\d{6,15}$/.test(digits)) {
      toast({
        variant: 'destructive',
        title: '❌ ' + t('error'),
        description: t('invalidPhone'),
      })
      return
    }

    setCreating(true)
    try {
      // Build the allowedTabs payload:
      // - If fullAccess is true → send null (primary-admin-like full access)
      // - If fullAccess is false → send the array of selected tab keys
      const allowedTabsPayload = createForm.fullAccess
        ? null
        : createForm.allowedTabs.length > 0
          ? createForm.allowedTabs
          : ['dashboard'] // if nothing selected, default to dashboard only

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_admin',
          name: createForm.name,
          phone: createForm.phone,
          password: createForm.password,
          allowedTabs: allowedTabsPayload,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMap: Record<string, string> = {
          missing_fields: locale === 'ar' ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields',
          password_too_short: locale === 'ar' ? 'كلمة المرور قصيرة جداً' : 'Password too short',
          invalid_phone: t('invalidPhone'),
          phone_already_used: t('phoneExists'),
          only_primary_admin_can_create: locale === 'ar' ? 'فقط المدير الرئيسي يمكنه إنشاء مدراء جدد' : 'Only the primary admin can create new admins',
        }
        toast({
          variant: 'destructive',
          title: '❌ ' + t('error'),
          description: errMap[data.error] || t('error'),
        })
        return
      }
      toast({
        variant: 'success',
        title: '✅ ' + t('adminCreated'),
        description: locale === 'ar'
          ? `تم إنشاء حساب مدير جديد برقم ${data.admin.phone}`
          : `New admin account created with phone ${data.admin.phone}`,
      })
      setCreateForm({ name: '', phone: '', password: '', fullAccess: true, allowedTabs: [] })
      setShowCreateModal(false)
      fetchAdmins()
    } catch (e) {
      toast({ variant: 'destructive', title: '❌ ' + t('error') })
    } finally {
      setCreating(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword) return
    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: '❌ ' + t('error'),
        description: locale === 'ar' ? 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)' : 'Password too short (min 6 chars)',
      })
      return
    }
    setResetting(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_admin_password',
          adminId: resetTarget.id,
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMap: Record<string, string> = {
          missing_fields: locale === 'ar' ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields',
          password_too_short: locale === 'ar' ? 'كلمة المرور قصيرة جداً' : 'Password too short',
          admin_not_found: locale === 'ar' ? 'المدير غير موجود' : 'Admin not found',
        }
        toast({
          variant: 'destructive',
          title: '❌ ' + t('error'),
          description: errMap[data.error] || t('error'),
        })
        return
      }
      toast({
        variant: 'success',
        title: '✅ ' + t('adminPasswordReset'),
        description: locale === 'ar'
          ? `تم تغيير كلمة مرور ${resetTarget.name}`
          : `Password changed for ${resetTarget.name}`,
      })
      setResetTarget(null)
      setNewPassword('')
      fetchAdmins()
    } catch (e) {
      toast({ variant: 'destructive', title: '❌ ' + t('error') })
    } finally {
      setResetting(false)
    }
  }

  const handleRemoveAdmin = async (admin: Admin) => {
    if (!confirm(
      locale === 'ar'
        ? `هل أنت متأكد من إزالة صلاحيات المدير من ${admin.name}؟`
        : `Are you sure you want to remove admin privileges from ${admin.name}?`
    )) return

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_admin', adminId: admin.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMap: Record<string, string> = {
          cannot_delete_self: t('cannotDeleteSelf'),
          cannot_delete_primary_admin: t('cannotDeletePrimaryAdmin'),
          admin_not_found: locale === 'ar' ? 'المدير غير موجود' : 'Admin not found',
        }
        toast({
          variant: 'destructive',
          title: '❌ ' + t('error'),
          description: errMap[data.error] || t('error'),
        })
        return
      }
      toast({
        variant: 'success',
        title: '✅ ' + t('adminRemoved'),
        description: locale === 'ar' ? `تمت إزالة صلاحيات ${admin.name}` : `Removed privileges from ${admin.name}`,
      })
      fetchAdmins()
    } catch (e) {
      toast({ variant: 'destructive', title: '❌ ' + t('error') })
    }
  }

  const handleToggleStatus = async (admin: Admin) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_admin_status', adminId: admin.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMap: Record<string, string> = {
          cannot_suspend_self: t('cannotSuspendSelf'),
          cannot_modify_primary_admin: t('cannotModifyPrimaryAdmin'),
          admin_not_found: locale === 'ar' ? 'المدير غير موجود' : 'Admin not found',
        }
        toast({
          variant: 'destructive',
          title: '❌ ' + t('error'),
          description: errMap[data.error] || t('error'),
        })
        return
      }
      toast({
        variant: 'success',
        title: '✅ ' + (data.status === 'active'
          ? (locale === 'ar' ? 'تم تفعيل الحساب' : 'Account activated')
          : (locale === 'ar' ? 'تم إيقاف الحساب' : 'Account suspended')),
      })
      fetchAdmins()
    } catch (e) {
      toast({ variant: 'destructive', title: '❌ ' + t('error') })
    }
  }

  // Open the edit-tabs modal for a sub-admin
  const openEditTabs = (admin: Admin) => {
    setEditTabsTarget(admin)
    const currentTabs = admin.allowedTabs && admin.allowedTabs.trim() !== ''
      ? admin.allowedTabs.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    setEditTabsForm({
      fullAccess: currentTabs.length === 0,
      allowedTabs: currentTabs,
    })
  }

  // Save updated tabs for a sub-admin
  const handleUpdateTabs = async () => {
    if (!editTabsTarget) return
    setUpdatingTabs(true)
    try {
      const allowedTabsPayload = editTabsForm.fullAccess
        ? null
        : editTabsForm.allowedTabs.length > 0
          ? editTabsForm.allowedTabs
          : ['dashboard']

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_admin_tabs',
          adminId: editTabsTarget.id,
          allowedTabs: allowedTabsPayload,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMap: Record<string, string> = {
          missing_fields: locale === 'ar' ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields',
          only_primary_admin_can_update_tabs: locale === 'ar' ? 'فقط المدير الرئيسي يمكنه تعديل الصلاحيات' : 'Only the primary admin can update tabs',
          cannot_modify_primary_admin: locale === 'ar' ? 'لا يمكن تعديل صلاحيات المدير الرئيسي' : 'Cannot modify primary admin tabs',
          admin_not_found: locale === 'ar' ? 'المدير غير موجود' : 'Admin not found',
          update_failed: locale === 'ar' ? 'فشل التحديث' : 'Update failed',
        }
        toast({
          variant: 'destructive',
          title: '❌ ' + t('error'),
          description: errMap[data.error] || t('error'),
        })
        return
      }
      toast({
        variant: 'success',
        title: '✅ ' + (locale === 'ar' ? 'تم تحديث الصلاحيات' : 'Permissions updated'),
        description: locale === 'ar'
          ? `تم تحديث صلاحيات ${editTabsTarget.name}`
          : `Updated permissions for ${editTabsTarget.name}`,
      })
      setEditTabsTarget(null)
      fetchAdmins()
    } catch (e) {
      toast({ variant: 'destructive', title: '❌ ' + t('error') })
    } finally {
      setUpdatingTabs(false)
    }
  }

  if (loading) {
    return <div className="h-64 glass rounded-2xl animate-pulse" />
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            {t('adminManagement')}
          </h2>
          <p className="text-xs text-white/40 mt-1">
            {locale === 'ar'
              ? `${admins.length} مدير — يمكنك إضافة مدراء إضافيين أو إزالة صلاحياتهم`
              : `${admins.length} admins — add additional admins or remove their privileges`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] transition-transform"
        >
          <UserPlus className="w-4 h-4" />
          {t('addAdmin')}
        </button>
      </div>

      {/* Admins grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {admins.map((admin) => {
          const isPrimary = admin.phone === '773178684'
          return (
            <motion.div
              key={admin.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass rounded-2xl p-5 relative overflow-hidden ${
                isPrimary ? 'border-2 border-amber-500/40' : 'border border-white/10'
              }`}
            >
              {isPrimary && (
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber-500/20 blur-3xl" />
              )}
              <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isPrimary ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {isPrimary ? <Crown className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {admin.name}
                        {isPrimary && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                            {t('primaryAdmin')}
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-white/40 font-mono">+{admin.phone}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    admin.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {admin.status === 'active' ? t('active') : t('inactive')}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="glass rounded-lg p-2">
                    <p className="text-[10px] text-white/40">{locale === 'ar' ? 'آخر دخول' : 'Last login'}</p>
                    <p className="text-white text-[11px]">
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')
                        : (locale === 'ar' ? 'لم يسجل بعد' : 'Never')}
                    </p>
                  </div>
                  <div className="glass rounded-lg p-2">
                    <p className="text-[10px] text-white/40">{locale === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</p>
                    <p className="text-white text-[11px]">
                      {new Date(admin.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                </div>

                {/* Access level display */}
                <div className="glass rounded-xl p-2 mb-3">
                  {!admin.allowedTabs || admin.allowedTabs.trim() === '' ? (
                    <p className="text-[10px] text-green-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {locale === 'ar' ? 'صلاحية كاملة (جميع التبويبات)' : 'Full access (all tabs)'}
                    </p>
                  ) : (
                    <div>
                      <p className="text-[10px] text-amber-400 flex items-center gap-1 mb-1">
                        <ShieldAlert className="w-3 h-3" />
                        {locale === 'ar' ? `صلاحية محدودة (${admin.allowedTabs.split(',').length} تبويبات)` : `Limited access (${admin.allowedTabs.split(',').length} tabs)`}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {admin.allowedTabs.split(',').map((tab, i) => {
                          const tabInfo = AVAILABLE_TABS.find((at) => at.key === tab.trim())
                          return (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/60">
                              {tabInfo ? (locale === 'ar' ? tabInfo.labelAr : tabInfo.labelEn) : tab}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { setResetTarget(admin); setNewPassword('') }}
                    className="flex-1 min-w-[100px] py-2 rounded-lg glass text-white text-xs hover:bg-white/10 flex items-center justify-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    {t('resetAdminPassword')}
                  </button>
                  {!isPrimary && (
                    <>
                      <button
                        onClick={() => openEditTabs(admin)}
                        className="flex-1 min-w-[100px] py-2 rounded-lg glass text-blue-400 text-xs hover:bg-blue-500/10 flex items-center justify-center gap-1"
                        title={locale === 'ar' ? 'تعديل الصلاحيات' : 'Edit Permissions'}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {locale === 'ar' ? 'تعديل الصلاحيات' : 'Edit Tabs'}
                      </button>
                      <button
                        onClick={() => handleToggleStatus(admin)}
                        className="py-2 px-3 rounded-lg glass text-white text-xs hover:bg-white/10"
                        title={admin.status === 'active' ? (locale === 'ar' ? 'إيقاف' : 'Suspend') : (locale === 'ar' ? 'تفعيل' : 'Activate')}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveAdmin(admin)}
                        className="py-2 px-3 rounded-lg glass text-red-400 hover:bg-red-500/10"
                        title={t('removeAdmin')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {isPrimary && (
                  <p className="text-[10px] text-amber-400/80 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {locale === 'ar'
                      ? 'المدير الرئيسي محمي — لا يمكن حذفه أو إيقافه'
                      : 'Primary admin is protected — cannot be deleted or suspended'}
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Create admin modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                  {t('createAdmin')}
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">{t('adminName')}</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder={locale === 'ar' ? 'اسم المدير' : 'Admin name'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {t('adminPhone')}
                  </label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="773178684"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-mono focus:outline-none focus:border-blue-500/50"
                  />
                  <p className="text-[10px] text-white/40 mt-1">
                    {locale === 'ar' ? '6-15 رقماً (بدون مسافات أو +)' : '6-15 digits (no spaces or +)'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {t('adminPassword')}
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder={locale === 'ar' ? 'كلمة المرور (6 أحرف على الأقل)' : 'Password (min 6 chars)'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* ===== Access Control: choose which tabs the sub-admin can see ===== */}
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {locale === 'ar' ? 'الصلاحيات والتبويبات' : 'Access & Tabs'}
                  </label>

                  {/* Full access toggle */}
                  <label className="flex items-center gap-2 text-white text-xs bg-blue-500/5 rounded-xl p-3 border border-blue-500/20 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={createForm.fullAccess}
                      onChange={(e) => setCreateForm({ ...createForm, fullAccess: e.target.checked })}
                      className="rounded"
                    />
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      {locale === 'ar'
                        ? 'صلاحية كاملة (جميع التبويبات — مثل المدير الرئيسي)'
                        : 'Full access (all tabs — like primary admin)'}
                    </span>
                  </label>

                  {/* Tab picker — only shown when fullAccess is false */}
                  {!createForm.fullAccess && (
                    <div className="glass rounded-xl p-3 border border-white/10">
                      <p className="text-[10px] text-white/40 mb-2">
                        {locale === 'ar'
                          ? 'اختر التبويبات التي يمكن لهذا المدير الفرعي رؤيتها:'
                          : 'Select which tabs this sub-admin can see:'}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {AVAILABLE_TABS.map((tab) => {
                          const checked = createForm.allowedTabs.includes(tab.key)
                          return (
                            <label
                              key={tab.key}
                              className={`flex items-center gap-1.5 text-[11px] p-2 rounded-lg cursor-pointer border transition-all ${
                                checked
                                  ? 'bg-blue-500/10 border-blue-500/40 text-white'
                                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCreateForm({
                                      ...createForm,
                                      allowedTabs: [...createForm.allowedTabs, tab.key],
                                    })
                                  } else {
                                    setCreateForm({
                                      ...createForm,
                                      allowedTabs: createForm.allowedTabs.filter((k) => k !== tab.key),
                                    })
                                  }
                                }}
                                className="rounded"
                              />
                              {locale === 'ar' ? tab.labelAr : tab.labelEn}
                            </label>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-amber-400/70 mt-2">
                        {locale === 'ar'
                          ? `المحدد: ${createForm.allowedTabs.length} من ${AVAILABLE_TABS.length} تبويب`
                          : `Selected: ${createForm.allowedTabs.length} of ${AVAILABLE_TABS.length} tabs`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 rounded-xl glass text-white text-sm font-medium hover:bg-white/10"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t('createAdmin')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset password modal */}
      <AnimatePresence>
        {resetTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setResetTarget(null); setNewPassword('') }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  {t('resetAdminPassword')}
                </h3>
                <button onClick={() => { setResetTarget(null); setNewPassword('') }} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="glass rounded-xl p-3 bg-blue-500/5 border border-blue-500/20">
                  <p className="text-xs text-white/80">
                    {locale === 'ar' ? 'تغيير كلمة مرور:' : 'Resetting password for:'}{' '}
                    <span className="font-bold text-white">{resetTarget.name}</span>
                  </p>
                  <p className="text-[10px] text-white/40 font-mono mt-1">+{resetTarget.phone}</p>
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">{t('newPasswordPlaceholder')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={locale === 'ar' ? 'كلمة المرور الجديدة' : 'New password'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setResetTarget(null); setNewPassword('') }}
                    className="flex-1 py-3 rounded-xl glass text-white text-sm font-medium hover:bg-white/10"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting || newPassword.length < 6}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    {t('resetAdminPassword')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit tabs modal */}
      <AnimatePresence>
        {editTabsTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditTabsTarget(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  {locale === 'ar' ? 'تعديل الصلاحيات' : 'Edit Permissions'}
                </h3>
                <button onClick={() => setEditTabsTarget(null)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="glass rounded-xl p-3 bg-blue-500/5 border border-blue-500/20">
                  <p className="text-xs text-white/80">
                    {locale === 'ar' ? 'تعديل صلاحيات:' : 'Editing permissions for:'}{' '}
                    <span className="font-bold text-white">{editTabsTarget.name}</span>
                  </p>
                  <p className="text-[10px] text-white/40 font-mono mt-1">+{editTabsTarget.phone}</p>
                </div>

                {/* Full access toggle */}
                <label className="flex items-center gap-2 text-white text-xs bg-blue-500/5 rounded-xl p-3 border border-blue-500/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editTabsForm.fullAccess}
                    onChange={(e) => setEditTabsForm({ ...editTabsForm, fullAccess: e.target.checked })}
                    className="rounded"
                  />
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {locale === 'ar'
                      ? 'صلاحية كاملة (جميع التبويبات)'
                      : 'Full access (all tabs)'}
                  </span>
                </label>

                {/* Tab picker */}
                {!editTabsForm.fullAccess && (
                  <div className="glass rounded-xl p-3 border border-white/10">
                    <p className="text-[10px] text-white/40 mb-2">
                      {locale === 'ar'
                        ? 'اختر التبويبات المسموح بها:'
                        : 'Select allowed tabs:'}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AVAILABLE_TABS.map((tab) => {
                        const checked = editTabsForm.allowedTabs.includes(tab.key)
                        return (
                          <label
                            key={tab.key}
                            className={`flex items-center gap-1.5 text-[11px] p-2 rounded-lg cursor-pointer border transition-all ${
                              checked
                                ? 'bg-blue-500/10 border-blue-500/40 text-white'
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditTabsForm({
                                    ...editTabsForm,
                                    allowedTabs: [...editTabsForm.allowedTabs, tab.key],
                                  })
                                } else {
                                  setEditTabsForm({
                                    ...editTabsForm,
                                    allowedTabs: editTabsForm.allowedTabs.filter((k) => k !== tab.key),
                                  })
                                }
                              }}
                              className="rounded"
                            />
                            {locale === 'ar' ? tab.labelAr : tab.labelEn}
                          </label>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-amber-400/70 mt-2">
                      {locale === 'ar'
                        ? `المحدد: ${editTabsForm.allowedTabs.length} من ${AVAILABLE_TABS.length} تبويب`
                        : `Selected: ${editTabsForm.allowedTabs.length} of ${AVAILABLE_TABS.length} tabs`}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditTabsTarget(null)}
                    className="flex-1 py-3 rounded-xl glass text-white text-sm font-medium hover:bg-white/10"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleUpdateTabs}
                    disabled={updatingTabs}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {updatingTabs ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {locale === 'ar' ? 'حفظ الصلاحيات' : 'Save Permissions'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
