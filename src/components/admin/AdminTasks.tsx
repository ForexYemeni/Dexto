'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit, Trash2, Power, X, CheckSquare, Gift, Award, Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Task {
  id: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  type: string
  rewardAmount: number
  rewardPoints: number
  isActive: boolean
  createdAt: string
}

export function AdminTasks() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin?section=tasks')
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAction = async (action: string, payload: any) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      if (res.ok) {
        toast({ variant: 'success', title: '✅ ' + t('success') })
        fetchData()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ variant: 'destructive', title: '❌ ' + t('error'), description: err.error || 'Failed' })
      }
    } catch {
      toast({ variant: 'destructive', title: '❌ ' + t('error') })
    }
  }

  const handleSave = async (task: any) => {
    const { id, createdAt, ...cleanTask } = task
    const safeTask = {
      title: cleanTask.title || 'Task',
      titleAr: cleanTask.titleAr || 'مهمة',
      description: cleanTask.description || null,
      descriptionAr: cleanTask.descriptionAr || null,
      type: cleanTask.type || 'custom',
      rewardAmount: Number(cleanTask.rewardAmount) || 0,
      rewardPoints: Number(cleanTask.rewardPoints) || 0,
      isActive: cleanTask.isActive !== undefined ? cleanTask.isActive : true,
    }
    const action = task.id ? 'update_task' : 'create_task'
    const payload = task.id ? { taskId: task.id, ...safeTask } : safeTask
    await handleAction(action, payload)
    setShowModal(false)
    setEditing(null)
  }

  const taskIcons: Record<string, React.ReactNode> = {
    daily_login: <CheckSquare className="w-5 h-5" />,
    share_link: <Gift className="w-5 h-5" />,
    invite_user: <Award className="w-5 h-5" />,
    custom: <Gift className="w-5 h-5" />,
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-400" />
          {locale === 'ar' ? 'إدارة المهام' : 'Tasks Management'}
        </h2>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" />
          {locale === 'ar' ? 'إضافة مهمة' : 'Add Task'}
        </button>
      </div>

      {/* Tasks grid */}
      {loading ? (
        <div className="h-64 glass rounded-2xl animate-pulse" />
      ) : tasks.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CheckSquare className="w-12 h-12 mx-auto text-white/10 mb-3" />
          <p className="text-sm text-white/40">{locale === 'ar' ? 'لا توجد مهام' : 'No tasks'}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5 relative overflow-hidden"
            >
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                      {taskIcons[task.type] || <Gift className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{locale === 'ar' ? task.titleAr : task.title}</h3>
                      <p className="text-[10px] text-white/40">{task.type}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${task.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {task.isActive ? t('active') : t('inactive')}
                  </span>
                </div>

                <p className="text-xs text-white/50 mb-3 min-h-[32px]">
                  {locale === 'ar' ? (task.descriptionAr || task.description) : (task.description || task.descriptionAr)}
                </p>

                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <p className="text-white/40">{t('reward')}</p>
                    <p className="text-white font-bold text-green-400">{task.rewardAmount} USDT</p>
                  </div>
                  <div>
                    <p className="text-white/40">{t('points')}</p>
                    <p className="text-white font-bold text-amber-400">{task.rewardPoints}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditing(task); setShowModal(true) }}
                    className="flex-1 py-2 rounded-lg glass text-white text-xs hover:bg-white/10 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => handleAction('toggle_task', { taskId: task.id })}
                    className="p-2 rounded-lg glass text-white hover:bg-white/10"
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(locale === 'ar' ? 'هل أنت متأكد؟' : 'Sure?')) {
                        handleAction('delete_task', { taskId: task.id })
                      }
                    }}
                    className="p-2 rounded-lg glass text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <TaskModal
            task={editing}
            onClose={() => { setShowModal(false); setEditing(null) }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TaskModal({ task, onClose, onSave }: { task: any | null; onClose: () => void; onSave: (t: any) => void }) {
  const { t, locale } = useI18n()
  const [form, setForm] = useState<any>(task || {
    title: '', titleAr: '', description: '', descriptionAr: '',
    type: 'custom', rewardAmount: 0.5, rewardPoints: 5, isActive: true,
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scroll"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{task ? (locale === 'ar' ? 'تعديل مهمة' : 'Edit Task') : (locale === 'ar' ? 'إضافة مهمة' : 'Add Task')}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label={locale === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'} value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field label={locale === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'} value={form.titleAr} onChange={(v) => setForm({ ...form, titleAr: v })} />
          <Field label={locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <Field label={locale === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'} value={form.descriptionAr} onChange={(v) => setForm({ ...form, descriptionAr: v })} />
          <div>
            <label className="text-xs text-white/60 mb-1.5 block">{locale === 'ar' ? 'النوع' : 'Type'}</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm"
            >
              <option value="daily_login" className="bg-slate-900">Daily Login</option>
              <option value="share_link" className="bg-slate-900">Share Link</option>
              <option value="invite_user" className="bg-slate-900">Invite User</option>
              <option value="custom" className="bg-slate-900">Custom</option>
            </select>
          </div>
          <Field label={`${t('reward')} (USDT)`} type="number" value={form.rewardAmount.toString()} onChange={(v) => setForm({ ...form, rewardAmount: Number(v) })} />
          <Field label={t('points')} type="number" value={form.rewardPoints.toString()} onChange={(v) => setForm({ ...form, rewardPoints: Number(v) })} />
          <div>
            <label className="text-xs text-white/60 mb-1.5 block">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
            <select
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm"
            >
              <option value="true" className="bg-slate-900">{t('active')}</option>
              <option value="false" className="bg-slate-900">{t('inactive')}</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl glass text-white text-sm">{t('cancel')}</button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold"
          >
            {t('save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-white/60 mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-blue-500/50"
      />
    </div>
  )
}
