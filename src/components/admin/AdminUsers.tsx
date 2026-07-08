'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Users, Ban, Check, Trash2, Edit, X, Loader2, UserPlus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, timeAgo } from '@/lib/time-utils'

export function AdminUsers() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [adjustingBalance, setAdjustingBalance] = useState<any | null>(null)
  const [adjustAmount, setAdjustAmount] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin?section=users&${params}`)
      const data = await res.json()
      setUsers(data.users || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [search, statusFilter])

  const handleAction = async (action: string, userId: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId }),
      })
      if (res.ok) {
        toast({ title: t('success') })
        fetchData()
      }
    } catch {}
  }

  const handleAdjustBalance = async () => {
    if (!adjustingBalance) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_balance',
          userId: adjustingBalance.id,
          amount: adjustAmount,
          reason: adjustReason,
        }),
      })
      if (res.ok) {
        toast({ title: t('success') })
        setAdjustingBalance(null)
        setAdjustAmount(0)
        setAdjustReason('')
        fetchData()
      }
    } catch {}
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Search & filters */}
      <div className="glass rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="all" className="bg-slate-900">{t('all')}</option>
          <option value="active" className="bg-slate-900">{t('active')}</option>
          <option value="suspended" className="bg-slate-900">{locale === 'ar' ? 'موقوف' : 'Suspended'}</option>
        </select>
      </div>

      {/* Users table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/60 text-xs">
                <th className="p-3 text-start font-medium">{t('name')}</th>
                <th className="p-3 text-start font-medium hidden md:table-cell">{t('balance')}</th>
                <th className="p-3 text-start font-medium hidden lg:table-cell">{t('totalInvestment')}</th>
                <th className="p-3 text-start font-medium">{t('status')}</th>
                <th className="p-3 text-end font-medium">{t('edit')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-white/40">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-white/40">{t('noData')}</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">{u.name}</p>
                          <p className="text-[10px] text-white/40">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <p className="text-xs text-white tabular-nums">{formatCurrency(u.balance, locale)}</p>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <p className="text-xs text-white tabular-nums">{formatCurrency(u.totalInvested, locale)}</p>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        u.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        u.status === 'suspended' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {u.status === 'active' ? t('active') : u.status === 'suspended' ? (locale === 'ar' ? 'موقوف' : 'Suspended') : u.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setAdjustingBalance(u)}
                          className="p-1.5 rounded-lg glass hover:bg-blue-500/20 transition-colors"
                          title={t('editBalance')}
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                        {u.status === 'active' ? (
                          <button
                            onClick={() => handleAction('suspend_user', u.id)}
                            className="p-1.5 rounded-lg glass hover:bg-red-500/20 transition-colors"
                            title={t('suspendUser')}
                          >
                            <Ban className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('activate_user', u.id)}
                            className="p-1.5 rounded-lg glass hover:bg-green-500/20 transition-colors"
                            title={t('activateUser')}
                          >
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(locale === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) {
                              handleAction('delete_user', u.id)
                            }
                          }}
                          className="p-1.5 rounded-lg glass hover:bg-red-500/20 transition-colors"
                          title={t('deleteUser')}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust balance modal */}
      <AnimatePresence>
        {adjustingBalance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAdjustingBalance(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{t('editBalance')}</h3>
                <button onClick={() => setAdjustingBalance(null)} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="glass rounded-xl p-3">
                  <p className="text-xs text-white/40">{locale === 'ar' ? 'المستخدم' : 'User'}</p>
                  <p className="text-sm font-medium text-white">{adjustingBalance.name}</p>
                  <p className="text-xs text-white/40">{locale === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}: {formatCurrency(adjustingBalance.balance, locale)} USDT</p>
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">
                    {locale === 'ar' ? 'المبلغ (موجب للإضافة، سالب للخصم)' : 'Amount (positive to add, negative to subtract)'}
                  </label>
                  <input
                    type="number"
                    value={adjustAmount || ''}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-lg font-bold focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">{locale === 'ar' ? 'السبب' : 'Reason'}</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <button
                  onClick={handleAdjustBalance}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:scale-[1.02] transition-transform"
                >
                  {t('save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


