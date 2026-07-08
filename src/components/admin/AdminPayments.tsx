'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion } from 'framer-motion'
import {
  Check, X, Clock, ArrowDownToLine, ArrowUpFromLine, Loader2, Copy,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, timeAgo } from '@/lib/time-utils'

export function AdminPayments() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [tab, setTab] = useState<'deposits' | 'withdrawals'>('deposits')
  const [statusFilter, setStatusFilter] = useState('all')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?section=${tab}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`)
      const data = await res.json()
      setItems(tab === 'deposits' ? (data.deposits || []) : (data.withdrawals || []))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [tab, statusFilter])

  const handleAction = async (action: string, id: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, [`${tab === 'deposits' ? 'depositId' : 'withdrawalId'}`]: id }),
      })
      if (res.ok) {
        toast({ title: t('success') })
        fetchData()
      }
    } catch {}
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('deposits')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
            tab === 'deposits' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 'glass text-white/60'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          {t('deposits')}
        </button>
        <button
          onClick={() => setTab('withdrawals')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
            tab === 'withdrawals' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : 'glass text-white/60'
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4" />
          {t('withdrawals')}
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'completed', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs ${
              statusFilter === s ? 'bg-blue-500 text-white' : 'glass text-white/60'
            }`}
          >
            {s === 'all' ? t('all') : s === 'pending' ? t('pending') : s === 'completed' ? t('completed') : t('rejected')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/60 text-xs">
                <th className="p-3 text-start font-medium">{t('name')}</th>
                <th className="p-3 text-start font-medium">{t('network')}</th>
                <th className="p-3 text-start font-medium">{t('amount')}</th>
                <th className="p-3 text-start font-medium">{tab === 'withdrawals' ? t('withdrawalAddress') : t('walletAddress')}</th>
                <th className="p-3 text-start font-medium">{t('status')}</th>
                <th className="p-3 text-end font-medium">{t('edit')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-white/40">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-white/40">{t('noData')}</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      <p className="text-xs font-medium text-white">{item.userName}</p>
                      <p className="text-[10px] text-white/40">{item.userEmail}</p>
                    </td>
                    <td className="p-3"><span className="text-xs text-white">{item.network}</span></td>
                    <td className="p-3">
                      <p className="text-xs font-bold text-white tabular-nums">{formatCurrency(item.amount, locale)}</p>
                      {tab === 'withdrawals' && item.fee > 0 && (
                        <p className="text-[10px] text-white/40">{locale === 'ar' ? 'صافي' : 'Net'}: {formatCurrency(item.netAmount, locale)}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <code className="text-[10px] text-white/70 font-mono break-all max-w-[180px]">{item.walletAddress}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(item.walletAddress)
                            toast({ title: t('copied') })
                          }}
                          className="shrink-0 p-1 rounded glass hover:bg-white/10 transition-colors"
                          title={t('copyAddress')}
                        >
                          <Copy className="w-3 h-3 text-white/60" />
                        </button>
                      </div>
                      {item.txHash && (
                        <p className="text-[10px] text-white/40 font-mono mt-1 break-all max-w-[180px]">TX: {item.txHash}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        item.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        item.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.status === 'completed' ? t('completed') : item.status === 'pending' ? t('pending') : item.status === 'rejected' ? t('rejected') : item.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {item.status === 'pending' ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleAction(tab === 'deposits' ? 'approve_deposit' : 'approve_withdrawal', item.id)}
                            className="p-1.5 rounded-lg glass hover:bg-green-500/20"
                            title={t('approve')}
                          >
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          </button>
                          <button
                            onClick={() => handleAction(tab === 'deposits' ? 'reject_deposit' : 'reject_withdrawal', item.id)}
                            className="p-1.5 rounded-lg glass hover:bg-red-500/20"
                            title={t('reject')}
                          >
                            <X className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-white/40 text-end">{timeAgo(item.createdAt, locale)}</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
