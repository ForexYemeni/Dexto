'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion } from 'framer-motion'
import {
  LifeBuoy, Mail, Phone, Send, MessageSquare, Clock, CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/time-utils'

interface SupportData {
  tickets: any[]
  supportEmail: string
  supportPhone: string
  supportTelegram: string
}

export function SupportView() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [data, setData] = useState<SupportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('normal')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/support')
      const json = await res.json()
      setData(json)
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
    if (!subject || !message) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: locale === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields',
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, priority }),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', title: t('error') })
        return
      }
      toast({ title: t('ticketCreated') })
      setSubject('')
      setMessage('')
      setPriority('normal')
      fetchData()
    } catch (e) {
      toast({ variant: 'destructive', title: t('error') })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !data) {
    return <div className="h-96 glass rounded-2xl animate-pulse" />
  }

  const priorityLabels: Record<string, string> = {
    low: locale === 'ar' ? 'منخفضة' : 'Low',
    normal: locale === 'ar' ? 'عادية' : 'Normal',
    high: locale === 'ar' ? 'عالية' : 'High',
  }

  const statusLabels: Record<string, string> = {
    open: locale === 'ar' ? 'مفتوحة' : 'Open',
    replied: locale === 'ar' ? 'تم الرد' : 'Replied',
    closed: locale === 'ar' ? 'مغلقة' : 'Closed',
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <LifeBuoy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('contactSupport')}</h1>
              <p className="text-xs text-white/40">{t('supportDesc')}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {data.supportEmail && (
              <div className="glass rounded-xl p-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-white truncate">{data.supportEmail}</span>
              </div>
            )}
            {data.supportPhone && (
              <div className="glass rounded-xl p-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-400" />
                <span className="text-xs text-white truncate">{data.supportPhone}</span>
              </div>
            )}
            <div className="glass rounded-xl p-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-white">{t('responseTime')}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* New ticket */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" />
            {t('newTicket')}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">{t('subject')}</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={locale === 'ar' ? 'موضوع التذكرة' : 'Ticket subject'}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="text-xs text-white/60 mb-1.5 block">{t('priority')}</label>
              <div className="grid grid-cols-3 gap-2">
                {['low', 'normal', 'high'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-2 rounded-lg text-xs transition-all ${
                      priority === p
                        ? p === 'high'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : p === 'normal'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        : 'glass text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {priorityLabels[p]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/60 mb-1.5 block">{t('message')}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder={locale === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('sendTicket')}
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Tickets list */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            {t('supportTickets')}
          </h3>

          {data.tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-white/10 mb-3" />
              <p className="text-sm text-white/40">{t('noTickets')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scroll">
              {data.tickets.map((ticket) => (
                <div key={ticket.id} className="glass rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{ticket.subject}</p>
                      <p className="text-[10px] text-white/40">
                        {timeAgo(ticket.createdAt, locale)} • {priorityLabels[ticket.priority]}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${
                      ticket.status === 'open' ? 'bg-amber-500/20 text-amber-400' :
                      ticket.status === 'replied' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {statusLabels[ticket.status]}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mb-2">{ticket.message}</p>
                  {ticket.reply && (
                    <div className="glass rounded-lg p-3 bg-blue-500/5 border-blue-500/20">
                      <p className="text-[10px] text-blue-400 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {locale === 'ar' ? 'رد الدعم' : 'Support Reply'}
                      </p>
                      <p className="text-xs text-white">{ticket.reply}</p>
                    </div>
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
