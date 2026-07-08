'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Pickaxe, ArrowDownToLine, ArrowUpFromLine,
  Settings, Wallet, LifeBuoy, ShieldCheck, Activity, ChevronRight,
  ChevronLeft, TrendingUp, DollarSign, AlertCircle,
} from 'lucide-react'
import { AdminDashboard } from './AdminDashboard'
import { AdminUsers } from './AdminUsers'
import { AdminPlans } from './AdminPlans'
import { AdminPayments } from './AdminPayments'
import { AdminWallets } from './AdminWallets'
import { AdminTickets } from './AdminTickets'
import { AdminSettings } from './AdminSettings'
import { AdminLogs } from './AdminLogs'

export function AdminView() {
  const { t, locale, isRTL } = useI18n()
  const [section, setSection] = useState('dashboard')

  const nav = [
    { key: 'dashboard', label: t('adminDashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'users', label: t('userManagement'), icon: <Users className="w-4 h-4" /> },
    { key: 'plans', label: t('miningManagement'), icon: <Pickaxe className="w-4 h-4" /> },
    { key: 'payments', label: t('paymentManagement'), icon: <DollarSign className="w-4 h-4" /> },
    { key: 'wallets', label: t('networks'), icon: <Wallet className="w-4 h-4" /> },
    { key: 'tickets', label: t('supportTickets'), icon: <LifeBuoy className="w-4 h-4" /> },
    { key: 'settings', label: t('platformSettings'), icon: <Settings className="w-4 h-4" /> },
    { key: 'logs', label: t('securityLogs'), icon: <ShieldCheck className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Admin nav tabs */}
      <div className="glass-strong rounded-2xl p-2 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {nav.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                section === item.key
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section content */}
      <motion.div
        key={section}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {section === 'dashboard' && <AdminDashboard />}
        {section === 'users' && <AdminUsers />}
        {section === 'plans' && <AdminPlans />}
        {section === 'payments' && <AdminPayments />}
        {section === 'wallets' && <AdminWallets />}
        {section === 'tickets' && <AdminTickets />}
        {section === 'settings' && <AdminSettings />}
        {section === 'logs' && <AdminLogs />}
      </motion.div>
    </div>
  )
}
