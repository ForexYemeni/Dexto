'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useUIStore, useAuthStore } from '@/lib/store'
import { motion } from 'framer-motion'
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, Users, Pickaxe,
  ArrowUpRight, ArrowDownRight, Clock, Activity, Gift, Coins,
  ChevronRight, ChevronLeft,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'
import { formatCurrency, formatMeccaTimeShort, timeAgo } from '@/lib/time-utils'
import { useSocket } from '@/lib/socket-client'

interface DashboardData {
  user: any
  activeSessions: any[]
  recentTransactions: any[]
  miningHistory: any[]
  activityLogs: any[]
  referralCount: number
  activeReferrals: number
  chartData: { date: string; profit: number }[]
}

export function DashboardView() {
  const { t, locale, isRTL } = useI18n()
  const { user, updateUser } = useAuthStore()
  const setView = useUIStore((s) => s.setView)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useSocket(user?.id)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/dashboard', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      const json = await res.json()
      if (json.user) {
        updateUser({
          balance: json.user.balance,
          totalInvested: json.user.totalInvested,
          totalProfit: json.user.totalProfit,
        })
      }
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000) // refresh every 15s for faster updates
    return () => clearInterval(interval)
  }, [])

  if (loading || !data) {
    return <DashboardSkeleton />
  }

  const stats = [
    {
      label: t('balance'),
      value: formatCurrency(data.user.balance, locale),
      icon: <Wallet className="w-5 h-5" />,
      gradient: 'from-blue-500/20 to-blue-600/10',
      iconColor: 'text-blue-400',
      glow: 'glow-electric',
    },
    {
      label: t('totalInvestment'),
      value: formatCurrency(data.user.totalInvested, locale),
      icon: <DollarSign className="w-5 h-5" />,
      gradient: 'from-purple-500/20 to-purple-600/10',
      iconColor: 'text-purple-400',
      glow: '',
    },
    {
      label: t('totalProfit'),
      value: formatCurrency(data.user.totalProfit, locale),
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: 'from-green-500/20 to-green-600/10',
      iconColor: 'text-green-400',
      glow: 'glow-profit',
    },
    {
      label: t('todayProfit'),
      value: formatCurrency(data.user.todayProfit, locale),
      icon: <Coins className="w-5 h-5" />,
      gradient: 'from-amber-500/20 to-amber-600/10',
      iconColor: 'text-amber-400',
      glow: 'glow-gold',
    },
    {
      label: t('monthProfit'),
      value: formatCurrency(data.user.monthProfit, locale),
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: 'from-cyan-500/20 to-cyan-600/10',
      iconColor: 'text-cyan-400',
      glow: '',
    },
    {
      label: t('referralProfit'),
      value: formatCurrency(data.user.referralProfit, locale),
      icon: <Gift className="w-5 h-5" />,
      gradient: 'from-pink-500/20 to-pink-600/10',
      iconColor: 'text-pink-400',
      glow: '',
    },
    {
      label: t('referralCount'),
      value: `${data.referralCount}`,
      icon: <Users className="w-5 h-5" />,
      gradient: 'from-indigo-500/20 to-indigo-600/10',
      iconColor: 'text-indigo-400',
      glow: '',
    },
    {
      label: t('activePlans'),
      value: `${data.activeSessions.length}`,
      icon: <Pickaxe className="w-5 h-5" />,
      gradient: 'from-orange-500/20 to-orange-600/10',
      iconColor: 'text-orange-400',
      glow: '',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/60 mb-1">
              {locale === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'},
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{user?.name} 👋</h1>
            <div className="flex flex-wrap gap-4 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatMeccaTimeShort(new Date(), locale)} ({locale === 'ar' ? 'مكة' : 'Mecca'})
              </span>
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-green-400" />
                {t('active')}
              </span>
            </div>
          </div>
          <div className="text-start md:text-end">
            <p className="text-xs text-white/40 mb-1">{t('balance')}</p>
            <p className="text-3xl font-bold gradient-text-electric tabular-nums">
              {formatCurrency(data.user.balance, locale)}
            </p>
            <p className="text-xs text-white/40">USDT</p>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`glass rounded-2xl p-4 relative overflow-hidden bg-gradient-to-br ${stat.gradient} ${stat.glow}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl glass ${stat.iconColor}`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-[10px] text-white/50 mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-white tabular-nums">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart + Active mining */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Profit chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">{t('profitChart')}</h3>
              <p className="text-xs text-white/40">{locale === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'}</p>
            </div>
            <button
              onClick={() => setView('wallet')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              {t('viewAll')}
              {isRTL ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={10}
                  tickFormatter={(v) => v.split('-').slice(1).join('/')}
                />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,20,40,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(v: number) => [`${formatCurrency(v, locale)} USDT`, t('todayProfit')]}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#profitGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Active mining */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">{t('activeMining')}</h3>
            <button
              onClick={() => setView('mining')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              {t('viewAll')}
              {isRTL ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>

          {data.activeSessions.length === 0 ? (
            <div className="text-center py-8">
              <Pickaxe className="w-10 h-10 mx-auto text-white/20 mb-2" />
              <p className="text-sm text-white/40 mb-3">{t('noActiveMining')}</p>
              <button
                onClick={() => setView('mining')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold hover:scale-105 transition-transform"
              >
                {t('startMining')}
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scroll">
              {data.activeSessions.map((session) => (
                <ActiveMiningCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent transactions + Activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">{t('recentTransactions')}</h3>
            <button
              onClick={() => setView('wallet')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              {t('viewAll')}
              {isRTL ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
          {data.recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 mx-auto text-white/20 mb-2" />
              <p className="text-sm text-white/40">{t('noTransactions')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scroll">
              {data.recentTransactions.slice(0, 8).map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Activity log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">{t('activityLog')}</h3>
          </div>
          {data.activityLogs.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 mx-auto text-white/20 mb-2" />
              <p className="text-sm text-white/40">{t('noData')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scroll">
              {data.activityLogs.slice(0, 8).map((log) => (
                <ActivityRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <h3 className="text-base font-semibold text-white mb-4">{t('quickActions')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction
            icon={<ArrowDownRight className="w-5 h-5" />}
            label={t('deposit')}
            color="from-green-500/20 to-green-600/10 text-green-400"
            onClick={() => setView('deposit')}
          />
          <QuickAction
            icon={<ArrowUpRight className="w-5 h-5" />}
            label={t('withdrawal')}
            color="from-orange-500/20 to-orange-600/10 text-orange-400"
            onClick={() => setView('withdrawal')}
          />
          <QuickAction
            icon={<Pickaxe className="w-5 h-5" />}
            label={t('startMining')}
            color="from-blue-500/20 to-blue-600/10 text-blue-400"
            onClick={() => setView('mining')}
          />
          <QuickAction
            icon={<Users className="w-5 h-5" />}
            label={t('referrals')}
            color="from-purple-500/20 to-purple-600/10 text-purple-400"
            onClick={() => setView('referrals')}
          />
        </div>
      </motion.div>
    </div>
  )
}

function ActiveMiningCard({ session }: { session: any }) {
  const { locale } = useI18n()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])

  const start = new Date(session.startedAt).getTime()
  const end = new Date(session.endsAt).getTime()
  const total = end - start
  const elapsed = now - start
  const remaining = Math.max(0, end - now)
  const progress = Math.min(100, Math.max(0, (elapsed / total) * 100))

  const hours = Math.floor(remaining / 3600000)
  const minutes = Math.floor((remaining % 3600000) / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  // Multi-day info
  const totalDays = session.totalDays || 1
  const currentDay = session.currentDay || 0
  const dailyProfit = session.dailyProfit || session.expectedProfit

  return (
    <div className="glass rounded-xl p-3 border border-blue-500/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white">{locale === 'ar' ? session.planNameAr : session.planName}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          {locale === 'ar' ? `يوم ${currentDay + 1}/${totalDays}` : `Day ${currentDay + 1}/${totalDays}`}
        </span>
      </div>
      <p className="text-xs text-green-400 mb-2">
        +{formatCurrency(dailyProfit, locale)} USDT/{locale === 'ar' ? 'يوم' : 'day'}
      </p>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
        <div className="h-full mining-progress transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-white/60 tabular-nums">
        {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </p>
    </div>
  )
}

function TransactionRow({ tx }: { tx: any }) {
  const { t, locale } = useI18n()
  const isCredit = tx.amount > 0
  const typeLabels: Record<string, string> = {
    deposit: t('deposit'),
    withdrawal: t('withdrawal'),
    mining_profit: t('mining'),
    referral_commission: t('referrals'),
    task_reward: t('tasks'),
    admin_adjustment: locale === 'ar' ? 'تعديل الإدارة' : 'Admin Adjustment',
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCredit ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {isCredit ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
        </div>
        <div>
          <p className="text-xs font-medium text-white">{typeLabels[tx.type] || tx.type}</p>
          <p className="text-[10px] text-white/40">{timeAgo(tx.createdAt, locale)}</p>
        </div>
      </div>
      <p className={`text-sm font-semibold tabular-nums ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
        {isCredit ? '+' : ''}{formatCurrency(tx.amount, locale)}
      </p>
    </div>
  )
}

function ActivityRow({ log }: { log: any }) {
  const { locale } = useI18n()
  const actionLabels: Record<string, string> = {
    login: locale === 'ar' ? 'تسجيل الدخول' : 'Login',
    logout: locale === 'ar' ? 'تسجيل الخروج' : 'Logout',
    deposit_request: locale === 'ar' ? 'طلب إيداع' : 'Deposit Request',
    withdrawal_request: locale === 'ar' ? 'طلب سحب' : 'Withdrawal Request',
    mining_start: locale === 'ar' ? 'بدء التعدين' : 'Mining Started',
    mining_stop: locale === 'ar' ? 'إيقاف التعدين' : 'Mining Stopped',
    register: locale === 'ar' ? 'إنشاء حساب' : 'Register',
    support_ticket_created: locale === 'ar' ? 'تذكرة دعم' : 'Support Ticket',
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{actionLabels[log.action] || log.action}</p>
        {log.details && <p className="text-[10px] text-white/40 truncate">{log.details}</p>}
      </div>
      <p className="text-[10px] text-white/40 shrink-0">{timeAgo(log.createdAt, locale)}</p>
    </div>
  )
}

function QuickAction({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`glass rounded-xl p-4 bg-gradient-to-br ${color} hover:scale-105 transition-transform flex flex-col items-center gap-2`}
    >
      {icon}
      <span className="text-xs font-medium text-white">{label}</span>
    </button>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 glass rounded-3xl animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 glass rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-80 glass rounded-2xl animate-pulse" />
        <div className="h-80 glass rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}
