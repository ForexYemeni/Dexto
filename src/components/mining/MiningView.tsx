'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useAuthStore, useUIStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pickaxe, Clock, TrendingUp, Zap, Award, Gem, Crown, Diamond,
  Check, Loader2, AlertCircle, Play, Lock, Timer, Sparkles, ArrowDownToLine,
} from 'lucide-react'
import { formatCurrency, formatMeccaTime } from '@/lib/time-utils'
import { useToast } from '@/hooks/use-toast'

interface MiningData {
  plans: any[]
  activeSessions: any[]
  history: any[]
  balance: number
}

export function MiningView() {
  const { t, locale, isRTL } = useI18n()
  const { user } = useAuthStore()
  const setView = useUIStore((s) => s.setView)
  const { toast } = useToast()
  const [data, setData] = useState<MiningData | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingPlan, setStartingPlan] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)
  const [investmentAmount, setInvestmentAmount] = useState<number>(0)
  const [showModal, setShowModal] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/mining')
      const json = await res.json()
      if (!res.ok) {
        console.error('Mining API error:', json)
        // Set fallback data so UI doesn't stay empty
        setData({ plans: [], activeSessions: [], history: [], balance: user?.balance ?? 0 })
        return
      }
      setData(json)
      if (json.balance !== undefined && user) {
        useAuthStore.getState().updateUser({ balance: json.balance })
      }
    } catch (e) {
      console.error(e)
      // Set fallback data
      setData({ plans: [], activeSessions: [], history: [], balance: user?.balance ?? 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  const openStartModal = (plan: any) => {
    setSelectedPlan(plan)
    setInvestmentAmount(plan.minInvestment)
    setShowModal(true)
  }

  const handleStartMining = async () => {
    if (!selectedPlan) return
    if (investmentAmount < selectedPlan.minInvestment || investmentAmount > selectedPlan.maxInvestment) {
      toast({
        variant: 'destructive',
        title: '❌ ' + t('error'),
        description: `${t('minInvestment')}: ${selectedPlan.minInvestment} USDT`,
      })
      return
    }

    setStartingPlan(selectedPlan.id)
    try {
      const res = await fetch('/api/mining', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          planId: selectedPlan.id,
          investmentAmount,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMap: Record<string, string> = {
          insufficient_balance: t('insufficientBalance'),
          already_active_for_plan: locale === 'ar' ? 'مشترك بالفعل في هذه الخطة' : 'Already subscribed to this plan',
          invalid_amount: t('error'),
          plan_not_available: locale === 'ar' ? 'الخطة غير متاحة' : 'Plan not available',
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
        title: '✅ ' + (locale === 'ar' ? 'تم الاشتراك بنجاح!' : 'Subscribed successfully!'),
        description: locale === 'ar'
          ? `فعّل التعدين يومياً لربح ${formatCurrency(data.session.dailyProfit, locale)} USDT/يوم`
          : `Activate mining daily to earn ${formatCurrency(data.session.dailyProfit, locale)} USDT/day`,
      })
      setShowModal(false)
      fetchData()
    } catch (e) {
      toast({ variant: 'destructive', title: '❌ ' + t('error'), description: t('error') })
    } finally {
      setStartingPlan(null)
    }
  }

  // Activate daily mining
  const handleActivateMining = async (sessionId: string) => {
    try {
      const res = await fetch('/api/mining', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', sessionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMap: Record<string, string> = {
          already_mining: locale === 'ar' ? 'التعدين مفعّل بالفعل' : 'Mining already activated',
          plan_completed: locale === 'ar' ? 'اكتملت الخطة' : 'Plan completed',
          session_not_found: locale === 'ar' ? 'الجلسة غير موجودة' : 'Session not found',
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
        title: '✅ ' + (locale === 'ar' ? 'تم تفعيل التعدين!' : 'Mining activated!'),
        description: locale === 'ar' ? 'بدأ التعدين لمدة 24 ساعة' : 'Mining started for 24 hours',
      })
      fetchData()
    } catch (e) {
      toast({ variant: 'destructive', title: '❌ ' + t('error') })
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-32 glass rounded-2xl animate-pulse" />
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 glass rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const planIcons: Record<string, React.ReactNode> = {
    pickaxe: <Pickaxe className="w-6 h-6" />,
    silver: <Award className="w-6 h-6" />,
    gold: <Crown className="w-6 h-6" />,
    diamond: <Diamond className="w-6 h-6" />,
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Active Mining Section */}
      {data.activeSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            {t('activeMining')}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {data.activeSessions.map((session) => (
              <ActiveMiningCard
                key={session.id}
                session={session}
                onActivate={() => handleActivateMining(session.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mining Plans */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Pickaxe className="w-5 h-5 text-blue-400" />
          {t('miningPlans')}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {data.plans.map((plan, i) => {
            const isActive = data.activeSessions.some((s) => s.planId === plan.id)
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="premium-card glass rounded-2xl p-6 relative overflow-hidden"
                style={{ borderColor: `${plan.color}40` }}
              >
                {/* Background glow */}
                <div
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20"
                  style={{ background: plan.color }}
                />

                <div className="relative">
                  {/* Plan header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                        style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}80)` }}
                      >
                        {planIcons[plan.icon] || <Gem className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {locale === 'ar' ? plan.nameAr : plan.name}
                        </h3>
                        <p className="text-xs text-white/40">
                          {locale === 'ar' ? plan.descriptionAr : plan.description}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        {locale === 'ar' ? 'يعمل' : 'Running'}
                      </span>
                    )}
                  </div>

                  {/* Plan stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="glass rounded-xl p-3">
                      <p className="text-[10px] text-white/40 mb-1">{t('dailyProfit')}</p>
                      <p className="text-lg font-bold text-green-400">
                        {(plan.dailyProfitRate * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="glass rounded-xl p-3">
                      <p className="text-[10px] text-white/40 mb-1">{locale === 'ar' ? 'المدة' : 'Duration'}</p>
                      <p className="text-lg font-bold text-white">
                        {plan.totalDays || 7} {locale === 'ar' ? 'أيام' : 'days'}
                      </p>
                    </div>
                    <div className="glass rounded-xl p-3">
                      <p className="text-[10px] text-white/40 mb-1">{t('minInvestment')}</p>
                      <p className="text-sm font-bold text-white">
                        {formatCurrency(plan.minInvestment, locale)}
                      </p>
                    </div>
                    <div className="glass rounded-xl p-3">
                      <p className="text-[10px] text-white/40 mb-1">{t('maxInvestment')}</p>
                      <p className="text-sm font-bold text-white">
                        {formatCurrency(plan.maxInvestment, locale)}
                      </p>
                    </div>
                  </div>

                  {/* Subscribe button */}
                  <button
                    onClick={() => openStartModal(plan)}
                    disabled={isActive || !plan.isActive}
                    className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: isActive
                        ? 'rgba(255,255,255,0.05)'
                        : `linear-gradient(135deg, ${plan.color}, ${plan.color}80)`,
                    }}
                  >
                    {isActive ? (
                      <>
                        <Timer className="w-4 h-4" />
                        {locale === 'ar' ? 'مشترك بالفعل' : 'Subscribed'}
                      </>
                    ) : !plan.isActive ? (
                      <>
                        <Lock className="w-4 h-4" />
                        {locale === 'ar' ? 'غير متاحة' : 'Unavailable'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {locale === 'ar' ? 'اشترك في الخطة' : 'Subscribe to Plan'}
                      </>
                    )}
                  </button>
                  {/* Show balance status */}
                  {!isActive && plan.isActive && (
                    <div className="mt-2 text-center">
                      {data.balance >= plan.minInvestment ? (
                        <p className="text-[10px] text-green-400">
                          {locale === 'ar'
                            ? `رصيدك: ${formatCurrency(data.balance, locale)} USDT ✓`
                            : `Balance: ${formatCurrency(data.balance, locale)} USDT ✓`}
                        </p>
                      ) : (
                        <button
                          onClick={() => setView('deposit')}
                          className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          {locale === 'ar'
                            ? `رصيدك ${formatCurrency(data.balance, locale)} USDT - اضغط للإيداع`
                            : `Balance ${formatCurrency(data.balance, locale)} USDT - Click to deposit`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Mining History */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" />
          {t('miningHistory')}
        </h2>
        <div className="glass rounded-2xl p-6">
          {data.history.length === 0 ? (
            <div className="text-center py-12">
              <Pickaxe className="w-12 h-12 mx-auto text-white/10 mb-3" />
              <p className="text-sm text-white/40">{t('noMiningHistory')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scroll">
              {data.history.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{h.planName}</p>
                      <p className="text-[10px] text-white/40">
                        {formatMeccaTime(h.startedAt, locale)} → {formatMeccaTime(h.completedAt, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold text-green-400 tabular-nums">
                      +{formatCurrency(h.profitAmount, locale)}
                    </p>
                    <p className="text-[10px] text-white/40">
                      {formatCurrency(h.investmentAmount, locale)} USDT
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Start mining modal */}
      <AnimatePresence>
        {showModal && selectedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                  style={{ background: `linear-gradient(135deg, ${selectedPlan.color}, ${selectedPlan.color}80)` }}
                >
                  {planIcons[selectedPlan.icon] || <Gem className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {locale === 'ar' ? selectedPlan.nameAr : selectedPlan.name}
                  </h3>
                  <p className="text-xs text-white/40">
                    {t('dailyProfit')}: {(selectedPlan.dailyProfitRate * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Balance */}
                <div className="glass rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-white/60">{t('availableBalance')}</span>
                  <span className={`text-sm font-bold tabular-nums ${(user?.balance ?? 0) < selectedPlan.minInvestment ? 'text-amber-400' : 'text-green-400'}`}>
                    {formatCurrency(user?.balance ?? 0, locale)} USDT
                  </span>
                </div>

                {/* Insufficient balance warning */}
                {(user?.balance ?? 0) < selectedPlan.minInvestment && (
                  <div className="glass rounded-xl p-4 bg-amber-500/10 border border-amber-500/30">
                    <p className="text-xs text-amber-400 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {locale === 'ar'
                        ? `رصيدك غير كافٍ. تحتاج ${formatCurrency(selectedPlan.minInvestment - (user?.balance ?? 0), locale)} USDT إضافية`
                        : `Insufficient balance. Need ${formatCurrency(selectedPlan.minInvestment - (user?.balance ?? 0), locale)} USDT more`}
                    </p>
                    <button
                      onClick={() => { setShowModal(false); setView('deposit') }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      {locale === 'ar' ? 'اذهب للإيداع' : 'Go to Deposit'}
                    </button>
                  </div>
                )}

                {/* Investment amount input */}
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">{t('investmentAmount')}</label>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    min={selectedPlan.minInvestment}
                    max={selectedPlan.maxInvestment}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-lg font-bold focus:outline-none focus:border-blue-500/50"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 mt-1">
                    <span>{t('min')}: {formatCurrency(selectedPlan.minInvestment, locale)}</span>
                    <span>{t('max')}: {formatCurrency(selectedPlan.maxInvestment, locale)}</span>
                  </div>
                </div>

                {/* Expected profit - daily + total */}
                <div className="glass rounded-xl p-4 bg-gradient-to-br from-green-500/10 to-green-600/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/60 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                      {locale === 'ar' ? 'الربح اليومي' : 'Daily Profit'}
                    </span>
                    <span className="text-lg font-bold text-green-400 tabular-nums">
                      +{formatCurrency(investmentAmount * selectedPlan.dailyProfitRate, locale)} USDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2 pt-2 border-t border-white/10">
                    <span className="text-xs text-white/60">
                      {locale === 'ar' ? `إجمالي الأرباح (${selectedPlan.totalDays || 7} أيام)` : `Total Profit (${selectedPlan.totalDays || 7} days)`}
                    </span>
                    <span className="text-lg font-bold text-purple-400 tabular-nums">
                      +{formatCurrency(investmentAmount * selectedPlan.dailyProfitRate * (selectedPlan.totalDays || 7), locale)} USDT
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <p className="text-[10px] text-white/50">
                      {locale === 'ar'
                        ? `رأس المال مقفل لمدة ${selectedPlan.totalDays || 7} أيام - تسحب الأرباح يومياً`
                        : `Capital locked for ${selectedPlan.totalDays || 7} days - withdraw profits daily`}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl glass text-white text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleStartMining}
                    disabled={startingPlan === selectedPlan.id}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {startingPlan === selectedPlan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {locale === 'ar' ? 'اشترك في الخطة' : 'Subscribe to Plan'}
                      </>
                    )}
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

function ActiveMiningCard({ session, onActivate }: { session: any; onActivate: () => void }) {
  const { t, locale, isRTL } = useI18n()
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

  // Multi-day plan info
  const totalDays = session.totalDays || 1
  const currentDay = session.currentDay || 0
  const dailyProfit = session.dailyProfit || session.expectedProfit
  const totalProfit = dailyProfit * totalDays
  const earnedProfit = dailyProfit * currentDay
  const isMiningStarted = session.miningStarted ?? true
  const planEndsAt = session.planEndsAt ? new Date(session.planEndsAt).getTime() : null
  const planRemaining = planEndsAt ? Math.max(0, planEndsAt - now) : 0
  const planDaysLeft = Math.ceil(planRemaining / (24 * 60 * 60 * 1000))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="premium-card glass rounded-2xl p-6 relative overflow-hidden"
      style={{ borderColor: `${session.planColor}40` }}
    >
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-30"
        style={{ background: session.planColor }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ background: `linear-gradient(135deg, ${session.planColor}, ${session.planColor}80)` }}
            >
              <Pickaxe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {locale === 'ar' ? session.planNameAr : session.planName}
              </h3>
              <p className="text-[10px] text-white/40">
                {formatCurrency(session.investmentAmount, locale)} USDT
              </p>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1 ${
            isMiningStarted
              ? 'bg-green-500/20 text-green-400'
              : (session.activatedAt ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400')
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              isMiningStarted ? 'bg-green-400' : (session.activatedAt ? 'bg-blue-400' : 'bg-amber-400')
            }`} />
            {isMiningStarted
              ? (locale === 'ar' ? 'يعمل' : 'Mining')
              : (session.activatedAt
                ? (locale === 'ar' ? 'بانتظار وقت البدء' : 'Waiting for Start Time')
                : (locale === 'ar' ? 'بانتظار التفعيل' : 'Needs Activation'))}
          </span>
        </div>

        {/* Activate Mining Button - shows when miningStarted=false AND not activated yet */}
        {!isMiningStarted && !session.activatedAt && currentDay < totalDays && (
          <button
            onClick={onActivate}
            className="w-full py-3 mb-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 animate-pulse-glow"
          >
            <Zap className="w-4 h-4" />
            {locale === 'ar' ? `تفعيل التعدين - اليوم ${currentDay + 1}` : `Activate Mining - Day ${currentDay + 1}`}
          </button>
        )}

        {/* Waiting message - when activated but waiting for admin-set time */}
        {!isMiningStarted && session.activatedAt && currentDay < totalDays && (
          <div className="w-full py-3 mb-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
            <p className="text-xs text-blue-400">
              {locale === 'ar'
                ? '⏳ تم التفعيل - يبدأ التعدين في الوقت المحدد من الإدارة'
                : '⏳ Activated - Mining will start at the admin-set time'}
            </p>
          </div>
        )}

        {/* Days Progress - NEW */}
        <div className="glass rounded-xl p-3 mb-4 bg-gradient-to-r from-blue-500/10 to-purple-500/5 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60 font-medium">
              {locale === 'ar' ? 'تقدم الخطة' : 'Plan Progress'}
            </span>
            <span className="text-xs font-bold text-white">
              {locale === 'ar' ? `اليوم ${currentDay + 1} من ${totalDays}` : `Day ${currentDay + 1} of ${totalDays}`}
            </span>
          </div>
          {/* Days dots */}
          <div className="flex gap-1 mb-2">
            {Array.from({ length: totalDays }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i < currentDay ? 'bg-green-500' : i === currentDay ? 'bg-blue-500 animate-pulse' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-white/40">
            <span>{locale === 'ar' ? `${planDaysLeft} يوم متبقي` : `${planDaysLeft} days left`}</span>
            <span className="text-green-400 font-medium">
              {locale === 'ar' ? `ربحت: ${formatCurrency(earnedProfit, locale)} USDT` : `Earned: ${formatCurrency(earnedProfit, locale)} USDT`}
            </span>
          </div>
        </div>

        {/* Countdown */}
        {isMiningStarted ? (
          // Mining in progress - show remaining time
          <div className="text-center mb-4">
            <p className="text-[10px] text-white/40 mb-1">
              {locale === 'ar' ? 'الوقت المتبقي للتعدين' : 'Mining Time Remaining'}
            </p>
            <p className="text-3xl font-bold gradient-text-electric tabular-nums">
              {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </p>
          </div>
        ) : session.activatedAt ? (
          // Activated but waiting for admin-set time - show countdown to start
          (() => {
            // Calculate time until mining starts (endsAt - 24h = start time)
            const durationMs = session.plan?.durationHours ? session.plan.durationHours * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
            const startAt = end - durationMs
            const waitRemaining = Math.max(0, startAt - now)
            const waitHours = Math.floor(waitRemaining / 3600000)
            const waitMinutes = Math.floor((waitRemaining % 3600000) / 60000)
            const waitSeconds = Math.floor((waitRemaining % 60000) / 1000)
            return (
              <div className="text-center mb-4">
                <p className="text-[10px] text-blue-400 mb-1">
                  {locale === 'ar' ? 'الوقت المتبقي لبدء التعدين' : 'Time Until Mining Starts'}
                </p>
                <p className="text-3xl font-bold text-blue-400 tabular-nums">
                  {waitHours.toString().padStart(2, '0')}:{waitMinutes.toString().padStart(2, '0')}:{waitSeconds.toString().padStart(2, '0')}
                </p>
              </div>
            )
          })()
        ) : (
          // Not activated - show message
          <div className="text-center mb-4 p-4 glass rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs text-amber-400 font-medium">
              {locale === 'ar'
                ? '🔒 التعدين متوقف - اضغط "تفعيل التعدين" بالأعلى لبدء دورة اليوم'
                : '🔒 Mining stopped - Click "Activate Mining" above to start today\'s cycle'}
            </p>
          </div>
        )}

        {/* Progress bar - only when mining */}
        {isMiningStarted && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
              <span>{locale === 'ar' ? 'تقدم اليوم' : 'Today Progress'}</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full mining-progress transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Daily profit + Total profit */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="glass rounded-xl p-3 bg-gradient-to-r from-green-500/10 to-transparent">
            <p className="text-[10px] text-white/40 mb-1">{locale === 'ar' ? 'الربح اليومي' : 'Daily Profit'}</p>
            <p className="text-sm font-bold text-green-400">
              +{formatCurrency(dailyProfit, locale)} USDT
            </p>
          </div>
          <div className="glass rounded-xl p-3 bg-gradient-to-r from-purple-500/10 to-transparent">
            <p className="text-[10px] text-white/40 mb-1">{locale === 'ar' ? 'إجمالي الأرباح' : 'Total Profit'}</p>
            <p className="text-sm font-bold text-purple-400">
              +{formatCurrency(totalProfit, locale)} USDT
            </p>
          </div>
        </div>

        {/* Capital locked notice - UPDATED */}
        <div className="glass rounded-xl p-3 bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-white/60 leading-relaxed">
              {locale === 'ar'
                ? `رأس المال (${formatCurrency(session.investmentAmount, locale)} USDT) مقفل حتى انتهاء الخطة (${totalDays} أيام). سيتم إرجاعه تلقائياً عند اكتمال جميع الأيام.`
                : `Capital (${formatCurrency(session.investmentAmount, locale)} USDT) is locked until plan ends (${totalDays} days). It will be returned automatically when all days complete.`}
            </p>
            <p className="text-[10px] text-green-400 mt-1">
              {locale === 'ar'
                ? '✓ يمكنك سحب الأرباح اليومية من صفحة السحب'
                : '✓ You can withdraw daily profits from the Withdraw page'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
