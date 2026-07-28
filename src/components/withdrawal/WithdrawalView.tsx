'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useAuthStore, useUIStore } from '@/lib/store'
import { motion } from 'framer-motion'
import {
  ArrowUpFromLine, AlertCircle, Loader2, Clock, CheckCircle2,
  XCircle, Wallet, Percent, Users, UserPlus, Sparkles, ShieldAlert, Link2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, timeAgo } from '@/lib/time-utils'

interface ReferralGate {
  enabled: boolean
  // active = the gate is actually applying right now (not first-withdrawal exempted)
  active: boolean
  isFirstWithdrawal: boolean
  previousWithdrawalsCount: number
  mode: 'block' | 'delay' | 'upgrade_only'
  delayHours: number
  minRequired: number
  current: number
  remaining: number
  passed: boolean
  nextPlan: {
    id: string
    name: string
    nameAr: string
    fixedAmount: number
    color: string
    icon: string
  } | null
  referralCode: string
  referralLink: string
}

interface WithdrawalData {
  withdrawals: any[]
  minWithdrawal: number
  withdrawalFee: number
  withdrawalFeeType: string
  balance: number
  referralGate: ReferralGate
}

const NETWORKS = ['TRC20', 'ERC20', 'BEP20', 'Polygon', 'Solana', 'Arbitrum', 'Optimism', 'TON']

export function WithdrawalView() {
  const { t, locale, isRTL } = useI18n()
  const { user, updateUser } = useAuthStore()
  const setView = useUIStore((s) => s.setView)
  const { toast } = useToast()
  const [data, setData] = useState<WithdrawalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [network, setNetwork] = useState('TRC20')
  const [amount, setAmount] = useState<number>(0)
  const [walletAddress, setWalletAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showGateModal, setShowGateModal] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/withdrawal', { cache: 'no-store' })
      const json = await res.json()
      setData(json)
      updateUser({ balance: json.balance })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async () => {
    if (!data) return

    // Referral gate client-side check (block mode).
    // Note: `active` is only true when this is NOT the first withdrawal AND the
    // user has fewer than the required referrals AND the gate is enabled.
    const gate = data.referralGate
    if (gate?.active && !gate.passed && gate.mode === 'block') {
      toast({
        variant: 'destructive',
        title: '❌ ' + (locale === 'ar' ? 'لا يمكن السحب — دعوة أصدقاء مطلوبة' : 'Cannot withdraw — referrals required'),
        description: locale === 'ar'
          ? `يجب عليك دعوة ${gate.remaining} صديق إضافي (مطلوب ${gate.minRequired} إجمالاً، لديك ${gate.current} حالياً). أو قم بالترقية للخطة التالية.`
          : `You must invite ${gate.remaining} more friend(s) (total ${gate.minRequired} required, you have ${gate.current}). Or upgrade to the next plan.`,
      })
      return
    }

    if (amount < data.minWithdrawal) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: `${t('minWithdrawal')}: ${data.minWithdrawal} USDT`,
      })
      return
    }
    if (amount > data.balance) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('insufficientBalance'),
      })
      return
    }
    if (!walletAddress) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('walletAddress'),
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, amount, walletAddress }),
      })
      const result = await res.json()
      if (!res.ok) {
        const errMap: Record<string, string> = {
          below_minimum: t('minWithdrawal'),
          insufficient_balance: t('insufficientBalance'),
          missing_fields: t('error'),
        }

        // Special handling for referral gate block
        if (result.error === 'referral_gate_blocked') {
          const msg = locale === 'ar' ? result.message_ar : result.message_en
          toast({
            variant: 'destructive',
            title: '❌ ' + (locale === 'ar' ? 'لا يمكن السحب — دعوة أصدقاء مطلوبة' : 'Cannot withdraw — referrals required'),
            description: msg,
          })
          return
        }

        toast({
          variant: 'destructive',
          title: '❌ ' + t('error'),
          description: errMap[result.error] || t('error'),
        })
        return
      }

      // Handle delayed withdrawal
      if (result.held) {
        toast({
          variant: 'destructive',
          title: '⏳ ' + (locale === 'ar' ? 'تم تأجيل السحب' : 'Withdrawal delayed'),
          description: locale === 'ar'
            ? `طلبك معلّق لمدة ${data.referralGate.delayHours} ساعة بسبب نقص الإحالات. ادعُ ${data.referralGate.remaining} صديق إضافي أو قم بالترقية لإلغاء التأخير.`
            : `Your request is held for ${data.referralGate.delayHours}h due to insufficient referrals. Invite ${data.referralGate.remaining} more friend(s) or upgrade to lift the delay.`,
        })
      } else {
        toast({
          variant: 'success',
          title: '✅ ' + (locale === 'ar' ? 'تم إرسال طلب السحب' : 'Withdrawal request submitted'),
          description: locale === 'ar' ? 'سيتم مراجعة طلبك ومعالجته قريباً' : 'Your request will be reviewed and processed soon',
        })
      }

      setAmount(0)
      setWalletAddress('')
      fetchData()
    } catch (e) {
      toast({ variant: 'destructive', title: '❌ ' + t('error') })
    } finally {
      setSubmitting(false)
    }
  }

  const copyReferralLink = () => {
    if (!data?.referralGate.referralLink) return
    navigator.clipboard.writeText(data.referralGate.referralLink)
    toast({
      variant: 'success',
      title: '✅ ' + (locale === 'ar' ? 'تم النسخ' : 'Copied'),
      description: locale === 'ar' ? 'شارك الرابط مع أصدقائك' : 'Share the link with your friends',
    })
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-32 glass rounded-2xl animate-pulse" />
        <div className="h-96 glass rounded-2xl animate-pulse" />
      </div>
    )
  }

  // Calculate fee
  const fee = data.withdrawalFeeType === 'percent'
    ? (amount * data.withdrawalFee) / 100
    : data.withdrawalFee
  const netAmount = amount - fee

  const networkLabels: Record<string, string> = {
    TRC20: t('network_trc20'),
    ERC20: t('network_erc20'),
    BEP20: t('network_bep20'),
    Polygon: t('network_polygon'),
    Solana: t('network_solana'),
    Arbitrum: t('network_arbitrum'),
    Optimism: t('network_optimism'),
    TON: t('network_ton'),
  }

  const gate = data.referralGate
  // gateBlocked = the user is actually being blocked right now (not first-withdrawal exempted)
  const gateBlocked = gate?.active && !gate?.passed && gate?.mode === 'block'

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="glass-strong rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <ArrowUpFromLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('newWithdrawal')}</h1>
              <p className="text-xs text-white/40">{t('withdrawal')}</p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-[10px] text-white/40">{t('availableBalance')}</p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(data.balance, locale)}
            </p>
            <p className="text-[10px] text-white/40">USDT</p>
          </div>
        </div>
      </div>

      {/* ===== Referral Gate Status Banner ===== */}
      {/* Hide the banner entirely on the user's first withdrawal so they don't
          see the gate exists until they attempt a second withdrawal. */}
      {gate?.enabled && !gate.isFirstWithdrawal && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass rounded-2xl p-5 relative overflow-hidden border ${
            gate.passed
              ? 'border-green-500/30 bg-green-500/5'
              : gate.mode === 'block'
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-amber-500/30 bg-amber-500/5'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              gate.passed
                ? 'bg-green-500/20 text-green-400'
                : gate.mode === 'block'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {gate.passed ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : gate.mode === 'block' ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('referralGateStatus')}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  gate.passed
                    ? 'bg-green-500/20 text-green-400'
                    : gate.mode === 'block'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {gate.passed
                    ? (locale === 'ar' ? 'مكتمل' : 'Passed')
                    : gate.mode === 'block'
                    ? (locale === 'ar' ? 'مطلوب إحالات' : 'Referrals needed')
                    : (locale === 'ar' ? 'تنبيه' : 'Warning')}
                </span>
              </div>

              {gate.passed ? (
                <p className="text-xs text-green-400">
                  {locale === 'ar'
                    ? `✓ متطلبات الإحالات مكتملة — لديك ${gate.current}/${gate.minRequired} إحالات. يمكنك السحب الآن.`
                    : `✓ Referral requirements met — you have ${gate.current}/${gate.minRequired} referrals. You can withdraw now.`}
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-white/80 leading-relaxed">
                    {locale === 'ar'
                      ? `لإتمام السحب، يجب دعوة ${gate.minRequired} أصدقاء على الأقل. لديك حالياً ${gate.current}/${gate.minRequired}. تحتاج ${gate.remaining} إضافي.`
                      : `To withdraw, you must invite at least ${gate.minRequired} friends. You currently have ${gate.current}/${gate.minRequired}. You need ${gate.remaining} more.`}
                  </p>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          gate.mode === 'block' ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, (gate.current / gate.minRequired) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/60 font-mono shrink-0">
                      {gate.current}/{gate.minRequired}
                    </span>
                  </div>

                  {/* Mode explanation */}
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    {gate.mode === 'block' && (
                      locale === 'ar'
                        ? '🚫 وضع الرفض: سيتم رفض طلب السحب حتى تكملة عدد الإحالات المطلوب أو الترقية للخطة التالية.'
                        : '🚫 Block mode: withdrawal will be rejected until you complete the required referrals or upgrade to the next plan.'
                    )}
                    {gate.mode === 'delay' && (
                      locale === 'ar'
                        ? `⏳ وضع التأخير: سيتم تأجيل طلب السحب لمدة ${gate.delayHours} ساعة. ادعُ ${gate.remaining} صديق إضافي أو قم بالترقية لإلغاء التأخير.`
                        : `⏳ Delay mode: your withdrawal will be held for ${gate.delayHours}h. Invite ${gate.remaining} more friend(s) or upgrade to lift the delay.`
                    )}
                    {gate.mode === 'upgrade_only' && (
                      locale === 'ar'
                        ? 'ℹ️ وضع التنبيه: يمكنك السحب ولكن ننصح بدعوة الأصدقاء أو الترقية.'
                        : 'ℹ️ Warn mode: you can withdraw but we recommend inviting friends or upgrading.'
                    )}
                  </p>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={copyReferralLink}
                      className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:scale-[1.02] transition-transform"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {locale === 'ar' ? 'انسخ رابط الدعوة' : 'Copy Referral Link'}
                    </button>
                    <button
                      onClick={() => setView('referrals')}
                      className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl glass text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {t('inviteMoreFriends')}
                    </button>
                    {gate.nextPlan && (
                      <button
                        onClick={() => setView('mining')}
                        className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:scale-[1.02] transition-transform"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('upgradePlan')}
                        {locale === 'ar' ? ` (${gate.nextPlan.nameAr})` : ` (${gate.nextPlan.name})`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Withdrawal form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`glass rounded-2xl p-6 ${gateBlocked ? 'opacity-60' : ''}`}
        >
          <h3 className="text-base font-semibold text-white mb-4">{t('newWithdrawal')}</h3>

          {/* Network */}
          <div className="mb-4">
            <label className="text-xs text-white/60 mb-1.5 block">{t('network')}</label>
            <div className="grid grid-cols-4 gap-2">
              {NETWORKS.map((n) => (
                <button
                  key={n}
                  onClick={() => setNetwork(n)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    network === n
                      ? 'bg-gradient-to-br from-orange-500/30 to-red-500/20 border-orange-500/50 text-white'
                      : 'glass border-white/10 text-white/60 hover:bg-white/5'
                  }`}
                >
                  <span className="text-[10px] font-semibold">{n}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="text-xs text-white/60 mb-1.5 block">{t('withdrawalAmount')} (USDT)</label>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={data.minWithdrawal}
              max={data.balance}
              placeholder={`${data.minWithdrawal} USDT`}
              disabled={gateBlocked}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-lg font-bold focus:outline-none focus:border-orange-500/50 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-white/40 mt-1">
              <span>{t('minWithdrawal')}: {formatCurrency(data.minWithdrawal, locale)}</span>
              <button
                onClick={() => setAmount(data.balance)}
                disabled={gateBlocked}
                className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                {locale === 'ar' ? 'الكل' : 'MAX'}
              </button>
            </div>
          </div>

          {/* Wallet address */}
          <div className="mb-4">
            <label className="text-xs text-white/60 mb-1.5 block">{t('withdrawalAddress')}</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={locale === 'ar' ? 'أدخل عنوان المحفظة' : 'Enter wallet address'}
              disabled={gateBlocked}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50 disabled:opacity-50"
            />
          </div>

          {/* Fee info */}
          <div className="glass rounded-xl p-3 mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60 flex items-center gap-1">
                <Percent className="w-3 h-3" />
                {t('withdrawalFee')}
              </span>
              <span className="text-white">
                {data.withdrawalFeeType === 'percent' ? `${data.withdrawalFee}%` : `${formatCurrency(data.withdrawalFee, locale)} USDT`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">{t('netAmount')}</span>
              <span className="text-green-400 font-bold tabular-nums">
                {formatCurrency(netAmount > 0 ? netAmount : 0, locale)} USDT
              </span>
            </div>
          </div>

          {/* Warning */}
          <div className="glass rounded-xl p-3 mb-4 bg-amber-500/5 border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/60">
                {locale === 'ar'
                  ? 'تأكد من صحة عنوان المحفظة والشبكة. لا يمكن استرجاع الأموال المرسلة إلى عنوان خاطئ.'
                  : 'Make sure the wallet address and network are correct. Funds sent to wrong addresses cannot be recovered.'}
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || amount < data.minWithdrawal || amount > data.balance || gateBlocked}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold shadow-lg shadow-orange-500/30 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : gateBlocked ? (
              <>
                <ShieldAlert className="w-5 h-5" />
                {locale === 'ar' ? 'السحب معطّل — اكمل الإحالات' : 'Withdrawal locked — complete referrals'}
              </>
            ) : (
              <>
                <ArrowUpFromLine className="w-5 h-5" />
                {t('submitWithdrawal')}
              </>
            )}
          </button>
        </motion.div>

        {/* Withdrawal history */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            {t('withdrawalHistory')}
          </h3>

          {data.withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <ArrowUpFromLine className="w-12 h-12 mx-auto text-white/10 mb-3" />
              <p className="text-sm text-white/40">{t('noWithdrawals')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scroll">
              {data.withdrawals.map((w) => {
                // Detect referral-gate held withdrawals via note pattern
                const isHeld = w.note?.startsWith('REFERRAL_GATE_HOLD|')
                return (
                  <div key={w.id} className="glass rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isHeld ? 'bg-amber-500/10 text-amber-400' :
                          w.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                          w.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                          w.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {isHeld ? <Clock className="w-4 h-4" /> :
                           w.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                           w.status === 'pending' ? <Clock className="w-4 h-4" /> :
                           w.status === 'rejected' ? <XCircle className="w-4 h-4" /> :
                           <Wallet className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">{networkLabels[w.network] || w.network}</p>
                          <p className="text-[10px] text-white/40">{timeAgo(w.createdAt, locale)}</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-bold text-red-400 tabular-nums">
                          -{formatCurrency(w.amount, locale)}
                        </p>
                        {w.fee > 0 && (
                          <p className="text-[10px] text-white/40">
                            {locale === 'ar' ? 'صافي' : 'Net'}: {formatCurrency(w.netAmount, locale)}
                          </p>
                        )}
                      </div>
                    </div>
                    {isHeld && (
                      <div className="glass rounded-lg p-2 mb-2 bg-amber-500/5 border border-amber-500/20">
                        <p className="text-[10px] text-amber-400 flex items-center gap-1.5">
                          <ShieldAlert className="w-3 h-3 shrink-0" />
                          {locale === 'ar'
                            ? 'معلّق بسبب بوابة الإحالات — ادعُ المزيد من الأصدقاء أو قم بالترقية لإلغاء التأخير.'
                            : 'Held by referral gate — invite more friends or upgrade to lift the delay.'}
                        </p>
                      </div>
                    )}
                    <p className="text-[10px] text-white/40 font-mono truncate">
                      → {w.walletAddress.slice(0, 20)}...
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
