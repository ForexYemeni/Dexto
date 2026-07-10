'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useAuthStore } from '@/lib/store'
import { motion } from 'framer-motion'
import {
  CheckSquare, Gift, Coins, Star, Loader2, Check, Lock, Award,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/time-utils'

interface TaskData {
  tasks: any[]
  balance: number
}

export function TasksView() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [data, setData] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/tasks')
      const json = await res.json()
      setData(json)
      useAuthStore.getState().updateUser({ balance: json.balance })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleClaim = async (taskId: string) => {
    setClaiming(taskId)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', taskId }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: '❌ ' + t('error'),
          description: result.error === 'already_claimed' ? t('rewardClaimed') : t('error'),
        })
        return
      }
      toast({
        variant: 'success',
        title: '✅ ' + t('rewardClaimed'),
        description: locale === 'ar' ? 'تم إضافة المكافأة إلى رصيدك' : 'Reward added to your balance',
      })
      fetchData()
    } catch (e) {
      toast({ variant: 'destructive', title: '❌ ' + t('error') })
    } finally {
      setClaiming(null)
    }
  }

  if (loading || !data) {
    return <div className="h-96 glass rounded-2xl animate-pulse" />
  }

  const taskIcons: Record<string, React.ReactNode> = {
    daily_login: <CheckSquare className="w-5 h-5" />,
    share_link: <Gift className="w-5 h-5" />,
    invite_user: <Award className="w-5 h-5" />,
    custom: <Star className="w-5 h-5" />,
  }

  const completedCount = data.tasks.filter((t) => t.status === 'completed' || t.status === 'claimed').length
  const claimedCount = data.tasks.filter((t) => t.status === 'claimed').length

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="relative grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-white/40 mb-1">{t('completedTasks')}</p>
            <p className="text-3xl font-bold text-white">{completedCount}/{data.tasks.length}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 mb-1">{t('reward')}</p>
            <p className="text-3xl font-bold text-amber-400">
              {formatCurrency(data.tasks.reduce((s, t) => s + (t.status === 'claimed' ? t.rewardAmount : 0), 0), locale)}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40 mb-1">{t('balance')}</p>
            <p className="text-3xl font-bold gradient-text-electric tabular-nums">
              {formatCurrency(data.balance, locale)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tasks list */}
      <div className="grid md:grid-cols-2 gap-4">
        {data.tasks.map((task, i) => {
          const isCompleted = task.status === 'completed'
          const isClaimed = task.status === 'claimed'
          const isPending = task.status === 'pending'

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass rounded-2xl p-5 relative overflow-hidden ${
                isClaimed ? 'opacity-60' : ''
              }`}
            >
              {isClaimed && (
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {locale === 'ar' ? 'تم الاستلام' : 'Claimed'}
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isClaimed ? 'bg-green-500/10 text-green-400' :
                  isCompleted ? 'bg-amber-500/10 text-amber-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  {taskIcons[task.type] || <Star className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white">
                    {locale === 'ar' ? task.titleAr : task.title}
                  </h3>
                  <p className="text-xs text-white/40">
                    {locale === 'ar' ? task.descriptionAr : task.description}
                  </p>
                </div>
              </div>

              {/* Rewards */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 glass rounded-lg p-2">
                  <p className="text-[10px] text-white/40">{t('reward')}</p>
                  <p className="text-sm font-bold text-green-400">
                    +{formatCurrency(task.rewardAmount, locale)} USDT
                  </p>
                </div>
                <div className="flex-1 glass rounded-lg p-2">
                  <p className="text-[10px] text-white/40">{t('points')}</p>
                  <p className="text-sm font-bold text-amber-400 flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    +{task.rewardPoints}
                  </p>
                </div>
              </div>

              {/* Action button */}
              {isCompleted && !isClaimed && (
                <button
                  onClick={() => handleClaim(task.id)}
                  disabled={claiming === task.id}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {claiming === task.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      {t('claimReward')}
                    </>
                  )}
                </button>
              )}
              {isPending && (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl glass text-white/40 text-xs font-medium flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {locale === 'ar' ? 'غير مكتملة' : 'Not completed'}
                </button>
              )}
              {isClaimed && (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl glass text-green-400 text-xs font-medium flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {t('rewardClaimed')}
                </button>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
