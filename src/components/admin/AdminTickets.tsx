'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { LifeBuoy, X, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/time-utils'

export function AdminTickets() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [replying, setReplying] = useState<any | null>(null)
  const [reply, setReply] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin?section=tickets')
      const data = await res.json()
      setTickets(data.tickets || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleReply = async () => {
    if (!replying || !reply) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply_ticket', ticketId: replying.id, reply }),
      })
      if (res.ok) {
        toast({ variant: 'success', title: '✅ ' + t('success') })
        setReplying(null)
        setReply('')
        fetchData()
      }
    } catch {}
  }

  const handleClose = async (ticketId: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close_ticket', ticketId }),
      })
      if (res.ok) {
        toast({ variant: 'success', title: '✅ ' + t('success') })
        fetchData()
      }
    } catch {}
  }

  if (loading) {
    return <div className="h-64 glass rounded-2xl animate-pulse" />
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <LifeBuoy className="w-5 h-5 text-blue-400" />
        {t('supportTickets')}
      </h2>

      {tickets.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <LifeBuoy className="w-12 h-12 mx-auto text-white/10 mb-3" />
          <p className="text-sm text-white/40">{t('noTickets')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-white">{ticket.subject}</p>
                  <p className="text-[10px] text-white/40">{ticket.userName} • {ticket.userEmail} • {timeAgo(ticket.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    ticket.status === 'open' ? 'bg-amber-500/20 text-amber-400' :
                    ticket.status === 'replied' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {ticket.status === 'open' ? t('open') : ticket.status === 'replied' ? t('replied') : t('closed')}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    ticket.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    ticket.priority === 'normal' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
              <p className="text-xs text-white/70 mb-2">{ticket.message}</p>
              {ticket.reply && (
                <div className="glass rounded-lg p-2 bg-blue-500/5 mb-2">
                  <p className="text-[10px] text-blue-400 mb-1">{locale === 'ar' ? 'رد الإدارة' : 'Admin Reply'}</p>
                  <p className="text-xs text-white">{ticket.reply}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setReplying(ticket); setReply(ticket.reply || '') }}
                  className="px-3 py-1.5 rounded-lg glass text-white text-xs hover:bg-white/10 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  {t('reply')}
                </button>
                {ticket.status !== 'closed' && (
                  <button
                    onClick={() => handleClose(ticket.id)}
                    className="px-3 py-1.5 rounded-lg glass text-red-400 text-xs hover:bg-red-500/10"
                  >
                    {t('close')}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reply modal */}
      <AnimatePresence>
        {replying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReplying(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{t('reply')}</h3>
                <button onClick={() => setReplying(null)}><X className="w-5 h-5 text-white" /></button>
              </div>
              <p className="text-xs text-white/60 mb-2">{replying.subject}</p>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm resize-none focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={handleReply}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {t('reply')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
