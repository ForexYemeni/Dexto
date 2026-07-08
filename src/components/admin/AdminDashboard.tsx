'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion } from 'framer-motion'
import {
  Users, UserCheck, DollarSign, TrendingUp, Pickaxe, Clock,
  ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatCurrency, timeAgo } from '@/lib/time-utils'

interface AdminData {
  totalUsers: number
  activeUsers: number
  totalDeposits: number
  completedDeposits: number
  totalWithdrawals: number
  completedWithdrawals: number
  pendingDeposits: number
  pendingWithdrawals: number
  totalProfitPaid: number
  totalMiningSessions: number
  activeMiningSessions: number
  recentDeposits: any[]
  recentWithdrawals: any[]
  chartData: { deposits: any[]; withdrawals: any[] }
}

export function AdminDashboard() {
  const { t, locale } = useI18n()
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin?section=dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return <div className="h-96 glass rounded-2xl animate-pulse" />
  }

  const stats = [
    { label: t('totalUsers'), value: data.totalUsers, sublabel: `${data.activeUsers} ${t('active')}`, icon: <Users className="w-5 h-5" />, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-400' },
    { label: t('totalDeposits'), value: formatCurrency(data.completedDeposits, locale), sublabel: `${data.pendingDeposits} ${t('pending')}`, icon: <ArrowDownToLine className="w-5 h-5" />, color: 'from-green-500 to-green-600', textColor: 'text-green-400' },
    { label: t('totalWithdrawals'), value: formatCurrency(data.completedWithdrawals, locale), sublabel: `${data.pendingWithdrawals} ${t('pending')}`, icon: <ArrowUpFromLine className="w-5 h-5" />, color: 'from-orange-500 to-red-600', textColor: 'text-orange-400' },
    { label: t('totalProfits'), value: formatCurrency(data.totalProfitPaid, locale), sublabel: `${data.activeMiningSessions} ${t('activeMining')}`, icon: <TrendingUp className="w-5 h-5" />, color: 'from-purple-500 to-pink-600', textColor: 'text-purple-400' },
  ]

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4 relative overflow-hidden"
          >
            <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-20 rounded-full blur-2xl`} />
            <div className={`mb-3 ${stat.textColor}`}>{stat.icon}</div>
            <p className="text-[10px] text-white/40 mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-white tabular-nums">{stat.value}</p>
            <p className="text-[10px] text-white/40 mt-1">{stat.sublabel}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-green-400" />
            {t('totalDeposits')} ({locale === 'ar' ? '7 أيام' : '7 days'})
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData.deposits}>
                <defs>
                  <linearGradient id="depositGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,20,40,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(v: number) => [`${formatCurrency(v, locale)} USDT`, t('deposit')]}
                />
                <Area type="monotone" dataKey="amount" stroke="#22C55E" strokeWidth={2} fill="url(#depositGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowUpFromLine className="w-4 h-4 text-orange-400" />
            {t('totalWithdrawals')} ({locale === 'ar' ? '7 أيام' : '7 days'})
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData.withdrawals}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,20,40,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(v: number) => [`${formatCurrency(v, locale)} USDT`, t('withdrawal')]}
                />
                <Bar dataKey="amount" fill="#F97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            {locale === 'ar' ? 'آخر الإيداعات' : 'Recent Deposits'}
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
            {data.recentDeposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-xs font-medium text-white">{d.userName}</p>
                  <p className="text-[10px] text-white/40">{d.network} • {timeAgo(d.createdAt, locale)}</p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold text-green-400">+{formatCurrency(d.amount, locale)}</p>
                  <p className="text-[10px] text-white/40">{d.status}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            {locale === 'ar' ? 'آخر السحوبات' : 'Recent Withdrawals'}
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
            {data.recentWithdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-xs font-medium text-white">{w.userName}</p>
                  <p className="text-[10px] text-white/40">{w.network} • {timeAgo(w.createdAt, locale)}</p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold text-orange-400">-{formatCurrency(w.amount, locale)}</p>
                  <p className="text-[10px] text-white/40">{w.status}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
