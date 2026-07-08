'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useAuthStore } from '@/lib/store'
import { motion } from 'framer-motion'
import {
  ArrowUpFromLine, AlertCircle, Loader2, Clock, CheckCircle2,
  XCircle, Wallet, Percent,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, timeAgo } from '@/lib/time-utils'

interface WithdrawalData {
  withdrawals: any[]
  minWithdrawal: number
  withdrawalFee: number
  withdrawalFeeType: string
  balance: number
}

const NETWORKS = ['TRC20', 'ERC20', 'BEP20', 'Polygon', 'Solana', 'Arbitrum', 'Optimism', 'TON']

export function WithdrawalView() {
  const { t, locale, isRTL } = useI18n()
  const { user, updateUser } = useAuthStore()
  const { toast } = useToast()
  const [data, setData] = useState<WithdrawalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [network, setNetwork] = useState('TRC20')
  const [amount, setAmount] = useState<number>(0)
  const [walletAddress, setWalletAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/withdrawal')
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
        toast({
          variant: 'destructive',
          title: t('error'),
          description: errMap[result.error] || t('error'),
        })
        return
      }
      toast({ title: locale === 'ar' ? 'تم إرسال طلب السحب' : 'Withdrawal request submitted' })
      setAmount(0)
      setWalletAddress('')
      fetchData()
    } catch (e) {
      toast({ variant: 'destructive', title: t('error') })
    } finally {
      setSubmitting(false)
    }
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

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Withdrawal form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
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
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-lg font-bold focus:outline-none focus:border-orange-500/50"
            />
            <div className="flex justify-between text-[10px] text-white/40 mt-1">
              <span>{t('minWithdrawal')}: {formatCurrency(data.minWithdrawal, locale)}</span>
              <button
                onClick={() => setAmount(data.balance)}
                className="text-blue-400 hover:text-blue-300"
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
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
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
            disabled={submitting || amount < data.minWithdrawal || amount > data.balance}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold shadow-lg shadow-orange-500/30 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
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
              {data.withdrawals.map((w) => (
                <div key={w.id} className="glass rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        w.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                        w.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                        w.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {w.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
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
                  <p className="text-[10px] text-white/40 font-mono truncate">
                    → {w.walletAddress.slice(0, 20)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
