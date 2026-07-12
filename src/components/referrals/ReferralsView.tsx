'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion } from 'framer-motion'
import {
  Users, Copy, Check, Share2, Gift, TrendingUp, UserPlus, QrCode,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, timeAgo } from '@/lib/time-utils'
import QRCode from 'qrcode'

interface ReferralData {
  referralCode: string
  referralLink: string
  referralProfit: number
  levels: {
    level1: { count: number; percentage: number }
    level2: { count: number; percentage: number }
    level3: { count: number; percentage: number }
  }
  totalReferrals: number
  activeReferrals: number
  referrals: any[]
  commissions: any[]
}

export function ReferralsView() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    fetch('/api/referrals', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData).catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (data?.referralLink) {
      QRCode.toDataURL(data.referralLink, { width: 200, margin: 1, color: { dark: '#000', light: '#fff' } })
        .then(setQrUrl)
        .catch(() => {})
    }
  }, [data?.referralLink])

  const handleCopy = async () => {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.referralLink)
      setCopied(true)
      toast({ variant: 'success', title: '✅ ' + t('copied') })
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleShare = async () => {
    if (!data) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: locale === 'ar' ? 'انضم لمنصة التعدين' : 'Join Mining Platform',
          text: locale === 'ar' ? 'ابدأ التعدين واربح أرباحاً يومية!' : 'Start mining and earn daily profits!',
          url: data.referralLink,
        })
      } catch {}
    } else {
      handleCopy()
    }
  }

  if (loading || !data) {
    return <div className="h-96 glass rounded-2xl animate-pulse" />
  }

  const levelCards = [
    {
      level: 1,
      count: data.levels.level1.count,
      percentage: data.levels.level1.percentage,
      color: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      level: 2,
      count: data.levels.level2.count,
      percentage: data.levels.level2.percentage,
      color: 'from-purple-500 to-purple-600',
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      level: 3,
      count: data.levels.level3.count,
      percentage: data.levels.level3.percentage,
      color: 'from-amber-500 to-amber-600',
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="relative grid md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-purple-400" />
              <h1 className="text-xl font-bold text-white">{t('referralProgram')}</h1>
            </div>
            <p className="text-sm text-white/60 mb-4">{t('referralDesc')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] text-white/40">{t('totalReferrals')}</p>
                <p className="text-2xl font-bold text-white">{data.totalReferrals}</p>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] text-white/40">{t('referralProfit')}</p>
                <p className="text-2xl font-bold text-green-400 tabular-nums">
                  {formatCurrency(data.referralProfit, locale)}
                </p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center">
            <div className="inline-block p-3 bg-white rounded-2xl">
              {qrUrl && <img src={qrUrl} alt="QR Code" className="w-40 h-40" />}
            </div>
            <p className="text-xs text-white/40 mt-2">{t('referralLink')}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCopy}
                className="flex-1 px-3 py-2 rounded-xl glass text-white text-xs flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {t('copyLink')}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                {t('shareLink')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Levels */}
      <div className="grid md:grid-cols-3 gap-4">
        {levelCards.map((lvl, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-2xl p-6 relative overflow-hidden"
          >
            <div className={`absolute -top-8 -right-8 w-24 h-24 ${lvl.bgColor} rounded-full blur-2xl`} />
            <div className="relative">
              <div className={`w-10 h-10 rounded-xl ${lvl.bgColor} ${lvl.iconColor} flex items-center justify-center mb-3`}>
                <Gift className="w-5 h-5" />
              </div>
              <p className="text-xs text-white/40 mb-1">
                {locale === 'ar' ? `المستوى ${lvl.level}` : `Level ${lvl.level}`}
              </p>
              <p className="text-3xl font-bold text-white mb-1">
                {(lvl.percentage * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-white/40">
                {lvl.count} {locale === 'ar' ? 'مدعو' : 'referrals'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Referrals list */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            {t('myReferrals')}
          </h3>
          {data.referrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 mx-auto text-white/10 mb-2" />
              <p className="text-sm text-white/40">{t('noReferrals')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scroll">
              {data.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{r.name}</p>
                      <p className="text-[10px] text-white/40">{r.email}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    {r.isActive && (
                      <span className="text-[10px] text-green-400 flex items-center gap-1 justify-end">
                        <span className="w-1 h-1 rounded-full bg-green-400" />
                        {t('active')}
                      </span>
                    )}
                    <p className="text-[10px] text-white/40">{timeAgo(r.joinedAt, locale)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commissions */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            {t('referralCommissions')}
          </h3>
          {data.commissions.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-10 h-10 mx-auto text-white/10 mb-2" />
              <p className="text-sm text-white/40">{t('noData')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scroll">
              {data.commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-white">
                      {locale === 'ar' ? `عمولة المستوى ${c.level}` : `Level ${c.level} Commission`}
                    </p>
                    <p className="text-[10px] text-white/40">
                      {(c.percentage * 100).toFixed(0)}% • {timeAgo(c.createdAt, locale)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-green-400 tabular-nums">
                    +{formatCurrency(c.amount, locale)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
