'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowDownToLine, Copy, Check, QrCode, AlertCircle, Loader2,
  Network, Clock, CheckCircle2, XCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatMeccaTime, timeAgo } from '@/lib/time-utils'
import QRCode from 'qrcode'

interface DepositData {
  wallets: any[]
  deposits: any[]
  minDeposit: number
  autoApprove: boolean
}

export function DepositView() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [data, setData] = useState<DepositData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [txHash, setTxHash] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState<string>('')

  const fetchData = async () => {
    try {
      const res = await fetch('/api/deposit')
      const json = await res.json()
      setData(json)
      if (json.wallets.length > 0 && !selectedNetwork) {
        setSelectedNetwork(json.wallets[0].network)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Generate QR code when network changes
  useEffect(() => {
    if (!data || !selectedNetwork) return
    const wallet = data.wallets.find((w) => w.network === selectedNetwork)
    if (wallet) {
      QRCode.toDataURL(wallet.address, { width: 240, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        .then(setQrUrl)
        .catch(() => setQrUrl(''))
    }
  }, [selectedNetwork, data])

  const handleCopy = async () => {
    if (!data || !selectedNetwork) return
    const wallet = data.wallets.find((w) => w.network === selectedNetwork)
    if (!wallet) return
    try {
      await navigator.clipboard.writeText(wallet.address)
      setCopied(true)
      toast({ title: t('copied') })
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleSubmit = async () => {
    if (!selectedNetwork || amount < (data?.minDeposit ?? 10)) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: `${t('minDeposit')}: ${data?.minDeposit ?? 10} USDT`,
      })
      return
    }

    setSubmitting(true)
    try {
      const wallet = data?.wallets.find((w) => w.network === selectedNetwork)
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network: selectedNetwork,
          amount,
          txHash,
          walletAddress: wallet?.address,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: result.error === 'below_minimum' ? t('minDeposit') : t('error'),
        })
        return
      }
      toast({ title: locale === 'ar' ? 'تم إرسال طلب الإيداع' : 'Deposit request submitted' })
      setAmount(0)
      setTxHash('')
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

  const selectedWallet = data.wallets.find((w) => w.network === selectedNetwork)
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
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-green-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center glow-profit">
            <ArrowDownToLine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t('newDeposit')}</h1>
            <p className="text-xs text-white/40">{t('depositInstructionsText')}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Deposit form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-400" />
            {t('selectNetwork')}
          </h3>

          {/* Network grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            {data.wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedNetwork(w.network)}
                className={`p-3 rounded-xl border transition-all text-center ${
                  selectedNetwork === w.network
                    ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/20 border-blue-500/50 text-white'
                    : 'glass border-white/10 text-white/60 hover:bg-white/5'
                }`}
              >
                <p className="text-xs font-semibold">{w.network}</p>
                <p className="text-[10px] opacity-60">{w.networkAr}</p>
              </button>
            ))}
          </div>

          {/* Selected wallet info */}
          {selectedWallet && (
            <>
              {/* QR Code */}
              <div className="text-center mb-4">
                <div className="inline-block p-4 bg-white rounded-2xl">
                  {qrUrl ? (
                    <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
                  ) : (
                    <QrCode className="w-48 h-48 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-white/40 mt-2">{t('scanQRCode')}</p>
              </div>

              {/* Address */}
              <div className="glass rounded-xl p-4 mb-4">
                <p className="text-[10px] text-white/40 mb-2">{t('depositAddress')} ({selectedWallet.network})</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-white font-mono break-all">
                    {selectedWallet.address}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 p-2 rounded-lg glass hover:bg-white/10 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div className="mb-4">
                <label className="text-xs text-white/60 mb-1.5 block">{t('depositAmount')} (USDT)</label>
                <input
                  type="number"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={data.minDeposit}
                  placeholder={`${data.minDeposit} USDT`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-lg font-bold focus:outline-none focus:border-blue-500/50"
                />
                <p className="text-[10px] text-white/40 mt-1">
                  {t('minDeposit')}: {formatCurrency(data.minDeposit, locale)} USDT
                </p>
              </div>

              {/* TX Hash input */}
              <div className="mb-4">
                <label className="text-xs text-white/60 mb-1.5 block">{t('txHash')}</label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-mono focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Warning */}
              <div className="glass rounded-xl p-3 mb-4 bg-amber-500/5 border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/60">
                    {locale === 'ar'
                      ? `أرسل فقط USDT على شبكة ${networkLabels[selectedWallet.network]}. إرسال عملات أخرى أو استخدام شبكة مختلفة سيؤدي إلى فقدان الأموال.`
                      : `Send only USDT on ${networkLabels[selectedWallet.network]} network. Sending other coins or using a different network will result in permanent loss.`}
                  </p>
                </div>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || amount < data.minDeposit}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg shadow-green-500/30 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ArrowDownToLine className="w-5 h-5" />
                    {t('submitDeposit')}
                  </>
                )}
              </button>
            </>
          )}
        </motion.div>

        {/* Deposit history */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            {t('depositHistory')}
          </h3>

          {data.deposits.length === 0 ? (
            <div className="text-center py-12">
              <ArrowDownToLine className="w-12 h-12 mx-auto text-white/10 mb-3" />
              <p className="text-sm text-white/40">{t('noDeposits')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scroll">
              {data.deposits.map((d) => (
                <div key={d.id} className="glass rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        d.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                        d.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {d.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                         d.status === 'pending' ? <Clock className="w-4 h-4" /> :
                         <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{networkLabels[d.network] || d.network}</p>
                        <p className="text-[10px] text-white/40">{timeAgo(d.createdAt, locale)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-green-400 tabular-nums">
                      +{formatCurrency(d.amount, locale)}
                    </p>
                  </div>
                  {d.txHash && (
                    <p className="text-[10px] text-white/40 font-mono truncate">
                      TX: {d.txHash}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
