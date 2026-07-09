'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, Power, X, Wallet, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function AdminWallets() {
  const { t, locale, isRTL } = useI18n()
  const { toast } = useToast()
  const [wallets, setWallets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState({ network: '', networkAr: '', address: '', isActive: true })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin?section=wallets')
      const data = await res.json()
      setWallets(data.wallets || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = async () => {
    try {
      const action = editing ? 'update_wallet' : 'add_wallet'
      const payload = editing ? { walletId: editing.id, ...form } : form
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      if (res.ok) {
        toast({ variant: 'success', title: '✅ ' + t('success') })
        setShowModal(false)
        setEditing(null)
        setForm({ network: '', networkAr: '', address: '', isActive: true })
        fetchData()
      }
    } catch {}
  }

  const handleAction = async (action: string, walletId: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, walletId }),
      })
      if (res.ok) {
        toast({ variant: 'success', title: '✅ ' + t('success') })
        fetchData()
      }
    } catch {}
  }

  const handleCopy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      toast({ variant: 'success', title: '✅ ' + t('copied') })
    } catch {}
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{t('networks')}</h2>
        <button
          onClick={() => { setEditing(null); setForm({ network: '', networkAr: '', address: '', isActive: true }); setShowModal(true) }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('addNetwork')}
        </button>
      </div>

      {loading ? (
        <div className="h-64 glass rounded-2xl animate-pulse" />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {wallets.map((w) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{w.network}</p>
                    <p className="text-[10px] text-white/40">{w.networkAr}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${w.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {w.isActive ? t('active') : t('inactive')}
                </span>
              </div>

              <div className="glass rounded-xl p-2 mb-3 flex items-center gap-2">
                <code className="flex-1 text-[10px] text-white font-mono break-all">{w.address}</code>
                <button onClick={() => handleCopy(w.address)} className="p-1.5 rounded-lg glass hover:bg-white/10">
                  <Copy className="w-3.5 h-3.5 text-white" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(w)
                    setForm({ network: w.network, networkAr: w.networkAr, address: w.address, isActive: w.isActive })
                    setShowModal(true)
                  }}
                  className="flex-1 py-2 rounded-lg glass text-white text-xs hover:bg-white/10 flex items-center justify-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  {t('edit')}
                </button>
                <button
                  onClick={() => handleAction('toggle_wallet', w.id)}
                  className="p-2 rounded-lg glass text-white hover:bg-white/10"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(locale === 'ar' ? 'هل أنت متأكد؟' : 'Sure?')) {
                      handleAction('delete_wallet', w.id)
                    }
                  }}
                  className="p-2 rounded-lg glass text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
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
                <h3 className="text-lg font-bold text-white">{editing ? t('edit') : t('addNetwork')}</h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-white" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">{locale === 'ar' ? 'اسم الشبكة (إنجليزي)' : 'Network Name (English)'}</label>
                  <input value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">{locale === 'ar' ? 'اسم الشبكة (عربي)' : 'Network Name (Arabic)'}</label>
                  <input value={form.networkAr} onChange={(e) => setForm({ ...form, networkAr: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">{t('walletAddress')}</label>
                  <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm font-mono" />
                </div>
                <label className="flex items-center gap-2 text-white text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  {t('active')}
                </label>
              </div>
              <button
                onClick={handleSave}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold"
              >
                {t('save')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
