'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion } from 'framer-motion'
import {
  Wallet, ArrowDownRight, ArrowUpRight, Pickaxe, Users, CheckSquare,
  Settings, TrendingUp, TrendingDown,
} from 'lucide-react'
import { formatCurrency, timeAgo } from '@/lib/time-utils'

interface WalletData {
  transactions: any[]
  balance: number
  summary: {
    totalDeposits: number
    totalWithdrawals: number
    totalMiningProfit: number
    totalReferralProfit: number
    totalTaskRewards: number
  }
}

export function WalletView() {
  const { t, locale, isRTL } = useI18n()
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/wallet', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData).catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return <div className="h-96 glass rounded-2xl animate-pulse" />
  }

  const filteredTx = filter === 'all'
    ? data.transactions
    : data.transactions.filter((tx) => tx.type === filter)

  const typeIcons: Record<string, React.ReactNode> = {
    deposit: <ArrowDownRight className="w-4 h-4" />,
    withdrawal: <ArrowUpRight className="w-4 h-4" />,
    mining_profit: <Pickaxe className="w-4 h-4" />,
    referral_commission: <Users className="w-4 h-4" />,
    task_reward: <CheckSquare className="w-4 h-4" />,
    admin_adjustment: <Settings className="w-4 h-4" />,
  }

  const typeLabels: Record<string, string> = {
    deposit: t('deposit'),
    withdrawal: t('withdrawal'),
    mining_profit: t('mining'),
    referral_commission: t('referrals'),
    task_reward: t('tasks'),
    admin_adjustment: locale === 'ar' ? 'تعديل الإدارة' : 'Admin Adjustment',
  }

  const stats = [
    { label: t('deposit'), value: data.summary.totalDeposits, color: 'text-green-400', icon: <ArrowDownRight className="w-4 h-4" /> },
    { label: t('withdrawal'), value: data.summary.totalWithdrawals, color: 'text-red-400', icon: <ArrowUpRight className="w-4 h-4" /> },
    { label: t('mining'), value: data.summary.totalMiningProfit, color: 'text-blue-400', icon: <Pickaxe className="w-4 h-4" /> },
    { label: t('referrals'), value: data.summary.totalReferralProfit, color: 'text-purple-400', icon: <Users className="w-4 h-4" /> },
  ]

  const filters = [
    { key: 'all', label: t('all') },
    { key: 'deposit', label: t('deposit') },
    { key: 'withdrawal', label: t('withdrawal') },
    { key: 'mining_profit', label: t('mining') },
    { key: 'referral_commission', label: t('referrals') },
    { key: 'task_reward', label: t('tasks') },
  ]

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Balance header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-xs text-white/40 mb-1">{t('walletBalance')}</p>
          <p className="text-4xl font-bold gradient-text-electric tabular-nums mb-1">
            {formatCurrency(data.balance, locale)}
          </p>
          <p className="text-xs text-white/40">USDT</p>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-4"
          >
            <div className={`mb-2 ${stat.color}`}>{stat.icon}</div>
            <p className="text-[10px] text-white/40 mb-1">{stat.label}</p>
            <p className={`text-lg font-bold tabular-nums ${stat.color}`}>
              {formatCurrency(stat.value, locale)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Transactions */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-base font-semibold text-white">{t('transactionHistory')}</h3>
          <div className="flex gap-1 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  filter === f.key
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'glass text-white/60 hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 mx-auto text-white/10 mb-3" />
            <p className="text-sm text-white/40">{t('noTransactions')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scroll">
            {filteredTx.map((tx) => {
              const isCredit = tx.amount > 0
              return (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isCredit ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {typeIcons[tx.type] || <Wallet className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{typeLabels[tx.type] || tx.type}</p>
                      <p className="text-[10px] text-white/40">
                        {tx.description || timeAgo(tx.createdAt, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className={`text-sm font-bold tabular-nums ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                      {isCredit ? '+' : ''}{formatCurrency(tx.amount, locale)}
                    </p>
                    <p className="text-[10px] text-white/40">{timeAgo(tx.createdAt, locale)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
