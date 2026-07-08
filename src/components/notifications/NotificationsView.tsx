'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useNotificationStore } from '@/lib/store'
import { motion } from 'framer-motion'
import {
  Bell, Check, Trash2, BellOff, Pickaxe, ArrowDownToLine,
  ArrowUpFromLine, Users, CheckSquare, Settings as SettingsIcon,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { timeAgo } from '@/lib/time-utils'

export function NotificationsView() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const { notifications, unreadCount, setNotifications, markAllRead, markAsRead } = useNotificationStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
      markAllRead()
      toast({ title: t('success') })
    } catch {}
  }

  const handleMarkRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', notificationId: id }),
      })
      markAsRead(id)
    } catch {}
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', notificationId: id }),
      })
      setNotifications(notifications.filter((n) => n.id !== id))
    } catch {}
  }

  const typeIcons: Record<string, React.ReactNode> = {
    deposit: <ArrowDownToLine className="w-4 h-4" />,
    withdrawal: <ArrowUpFromLine className="w-4 h-4" />,
    mining: <Pickaxe className="w-4 h-4" />,
    referral: <Users className="w-4 h-4" />,
    task: <CheckSquare className="w-4 h-4" />,
    system: <SettingsIcon className="w-4 h-4" />,
  }

  const typeColors: Record<string, string> = {
    deposit: 'bg-green-500/10 text-green-400',
    withdrawal: 'bg-orange-500/10 text-orange-400',
    mining: 'bg-blue-500/10 text-blue-400',
    referral: 'bg-purple-500/10 text-purple-400',
    task: 'bg-amber-500/10 text-amber-400',
    system: 'bg-gray-500/10 text-gray-400',
  }

  if (loading) {
    return <div className="h-96 glass rounded-2xl animate-pulse" />
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="glass-strong rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t('notifications')}</h1>
            <p className="text-xs text-white/40">
              {unreadCount} {t('unread')}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 rounded-xl glass text-white text-xs hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5" />
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <BellOff className="w-12 h-12 mx-auto text-white/10 mb-3" />
          <p className="text-sm text-white/40">{t('noNotifications')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`glass rounded-xl p-4 flex items-start gap-3 ${
                !n.isRead ? 'border-blue-500/30 bg-blue-500/5' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeColors[n.type] || typeColors.system}`}>
                {typeIcons[n.type] || <Bell className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">
                    {locale === 'ar' ? n.titleAr : n.title}
                  </p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                </div>
                <p className="text-xs text-white/60 mb-1">
                  {locale === 'ar' ? n.messageAr : n.message}
                </p>
                <p className="text-[10px] text-white/40">{timeAgo(n.createdAt, locale)}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="p-1.5 rounded-lg glass hover:bg-white/10 transition-colors"
                    title={t('markAsRead')}
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n.id)}
                  className="p-1.5 rounded-lg glass hover:bg-red-500/10 transition-colors"
                  title={t('deleteNotification')}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
