'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit, Trash2, Power, X, Pickaxe, Award, Crown, Diamond, Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/time-utils'

export function AdminPlans() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin?section=plans')
      const data = await res.json()
      setPlans(data.plans || [])
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
        toast({ title: t('success') })
        fetchData()
      }
    } catch {}
  }

  const handleSave = async (plan: any) => {
    const action = plan.id ? 'update_plan' : 'create_plan'
    const payload = plan.id ? { planId: plan.id, ...plan } : plan
    delete payload.id
    await handleAction(action, payload)
    setShowModal(false)
    setEditing(null)
  }

  const planIcons: Record<string, React.ReactNode> = {
    pickaxe: <Pickaxe className="w-5 h-5" />,
    silver: <Award className="w-5 h-5" />,
    gold: <Crown className="w-5 h-5" />,
    diamond: <Diamond className="w-5 h-5" />,
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{t('miningManagement')}</h2>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" />
          {t('addPlan')}
        </button>
      </div>

      {/* Plans grid */}
      {loading ? (
        <div className="h-64 glass rounded-2xl animate-pulse" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5 relative overflow-hidden"
              style={{ borderColor: `${plan.color}40` }}
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-20" style={{ background: plan.color }} />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}80)` }}>
                      {planIcons[plan.icon] || <Pickaxe className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{locale === 'ar' ? plan.nameAr : plan.name}</h3>
                      <p className="text-[10px] text-white/40">{(plan.dailyProfitRate * 100).toFixed(0)}% / {plan.durationHours}h</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${plan.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {plan.isActive ? t('active') : t('inactive')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <p className="text-white/40">{t('minInvestment')}</p>
                    <p className="text-white font-bold">{formatCurrency(plan.minInvestment, locale)}</p>
                  </div>
                  <div>
                    <p className="text-white/40">{t('maxInvestment')}</p>
                    <p className="text-white font-bold">{formatCurrency(plan.maxInvestment, locale)}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditing(plan); setShowModal(true) }}
                    className="flex-1 py-2 rounded-lg glass text-white text-xs hover:bg-white/10 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => handleAction('toggle_plan', { planId: plan.id })}
                    className="flex-1 py-2 rounded-lg glass text-white text-xs hover:bg-white/10 flex items-center justify-center gap-1"
                  >
                    <Power className="w-3.5 h-3.5" />
                    {plan.isActive ? (locale === 'ar' ? 'إيقاف' : 'Disable') : (locale === 'ar' ? 'تفعيل' : 'Enable')}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(locale === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) {
                        handleAction('delete_plan', { planId: plan.id })
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

      {/* Edit/Create modal */}
      <AnimatePresence>
        {showModal && (
          <PlanModal
            plan={editing}
            onClose={() => { setShowModal(false); setEditing(null) }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PlanModal({ plan, onClose, onSave }: { plan: any | null; onClose: () => void; onSave: (p: any) => void }) {
  const { t, locale } = useI18n()
  const [form, setForm] = useState<any>(plan || {
    name: '', nameAr: '', description: '', descriptionAr: '',
    price: 50, dailyProfitRate: 0.02, durationHours: 24,
    minInvestment: 50, maxInvestment: 1000,
    color: '#3B82F6', icon: 'pickaxe', isActive: true, sortOrder: 1,
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
          <h3 className="text-lg font-bold text-white">{plan ? t('editPlan') : t('addPlan')}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label={locale === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label={locale === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} value={form.nameAr} onChange={(v) => setForm({ ...form, nameAr: v })} />
          <Field label={`${t('dailyProfitRate')} (%)`} type="number" value={(form.dailyProfitRate * 100).toString()} onChange={(v) => setForm({ ...form, dailyProfitRate: Number(v) / 100 })} />
          <Field label={`${t('duration')} (${t('hours')})`} type="number" value={form.durationHours.toString()} onChange={(v) => setForm({ ...form, durationHours: Number(v) })} />
          <Field label={t('minInvestment')} type="number" value={form.minInvestment.toString()} onChange={(v) => setForm({ ...form, minInvestment: Number(v) })} />
          <Field label={t('maxInvestment')} type="number" value={form.maxInvestment.toString()} onChange={(v) => setForm({ ...form, maxInvestment: Number(v) })} />
          <Field label={t('primaryColor')} type="color" value={form.color} onChange={(v) => setForm({ ...form, color: v })} />
          <div>
            <label className="text-xs text-white/60 mb-1.5 block">{locale === 'ar' ? 'الأيقونة' : 'Icon'}</label>
            <select
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm"
            >
              <option value="pickaxe" className="bg-slate-900">Pickaxe</option>
              <option value="silver" className="bg-slate-900">Award (Silver)</option>
              <option value="gold" className="bg-slate-900">Crown (Gold)</option>
              <option value="diamond" className="bg-slate-900">Diamond</option>
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
