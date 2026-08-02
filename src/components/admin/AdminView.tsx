'use client'

import { useEffect, useState, Component, ReactNode } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useAuthStore } from '@/lib/store'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Pickaxe, ArrowDownToLine, ArrowUpFromLine,
  Settings, Wallet, LifeBuoy, ShieldCheck, Activity, ChevronRight,
  ChevronLeft, TrendingUp, DollarSign, AlertCircle, ShieldAlert,
} from 'lucide-react'
import { AdminDashboard } from './AdminDashboard'
import { AdminUsers } from './AdminUsers'
import { AdminPlans } from './AdminPlans'
import { AdminPayments } from './AdminPayments'
import { AdminWallets } from './AdminWallets'
import { AdminTickets } from './AdminTickets'
import { AdminSettings } from './AdminSettings'
import { AdminLogs } from './AdminLogs'
import { AdminAdmins } from './AdminAdmins'

// ===== Local Error Boundary =====
// Catches errors from admin sub-components and shows a friendly message
// instead of the global "حدث خطأ" page.
class AdminErrorBoundary extends Component<
  { children: ReactNode; locale: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; locale: string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[AdminErrorBoundary] caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      const ar = this.props.locale === 'ar'
      return (
        <div className="glass rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">
            {ar ? 'تعذر تحميل هذا القسم' : 'Failed to load this section'}
          </h3>
          <p className="text-xs text-white/60 mb-4 font-mono">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold"
          >
            {ar ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// All available admin tabs (in display order)
const ALL_TABS = [
  { key: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'users', icon: <Users className="w-4 h-4" /> },
  { key: 'admins', icon: <ShieldAlert className="w-4 h-4" /> },
  { key: 'plans', icon: <Pickaxe className="w-4 h-4" /> },
  { key: 'payments', icon: <DollarSign className="w-4 h-4" /> },
  { key: 'wallets', icon: <Wallet className="w-4 h-4" /> },
  { key: 'tickets', icon: <LifeBuoy className="w-4 h-4" /> },
  { key: 'settings', icon: <Settings className="w-4 h-4" /> },
  { key: 'logs', icon: <ShieldCheck className="w-4 h-4" /> },
] as const

export function AdminView() {
  const { t, locale, isRTL } = useI18n()
  const { user } = useAuthStore()
  const [section, setSection] = useState('dashboard')

  // Determine which tabs this admin can see.
  // - Primary admin (phone 773178684) or allowedTabs=null/empty = ALL tabs
  // - Sub-admin with allowedTabs="dashboard,users" = only those 2 tabs
  const allowedTabsRaw = user?.allowedTabs
  const isPrimaryAdmin = user?.phone === '773178684'
  const hasFullAccess = isPrimaryAdmin || !allowedTabsRaw || allowedTabsRaw.trim() === ''
  const allowedTabKeys = hasFullAccess
    ? ALL_TABS.map((tab) => tab.key)
    : allowedTabsRaw.split(',').map((s) => s.trim()).filter(Boolean)

  // Build the nav list — only include tabs the user is allowed to see
  const nav = ALL_TABS
    .filter((tab) => allowedTabKeys.includes(tab.key))
    .map((tab) => ({
      key: tab.key,
      label: t(tabLabelKey(tab.key)),
      icon: tab.icon,
    }))

  // If the current section is not in the allowed list, fall back to the first allowed tab
  useEffect(() => {
    if (nav.length > 0 && !nav.some((n) => n.key === section)) {
      setSection(nav[0].key)
    }
  }, [nav, section])

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Admin nav tabs — wraps on multiple lines so all tabs are always visible */}
      <div className="glass-strong rounded-2xl p-2">
        <div className="flex flex-wrap gap-1.5">
          {nav.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
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

      {/* Access restriction notice for sub-admins */}
      {!hasFullAccess && (
        <div className="glass rounded-xl p-3 bg-amber-500/5 border border-amber-500/20 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-[11px] text-amber-400">
            {locale === 'ar'
              ? `أنت مدير فرعي — لديك صلاحية الوصول إلى ${nav.length} تبويبات فقط.`
              : `You are a sub-admin — you have access to ${nav.length} tabs only.`}
          </p>
        </div>
      )}

      {/* Section content — wrapped in Error Boundary to prevent global crash */}
      <AdminErrorBoundary locale={locale}>
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {section === 'dashboard' && <AdminDashboard />}
          {section === 'users' && <AdminUsers />}
          {section === 'admins' && <AdminAdmins />}
          {section === 'plans' && <AdminPlans />}
          {section === 'payments' && <AdminPayments />}
          {section === 'wallets' && <AdminWallets />}
          {section === 'tickets' && <AdminTickets />}
          {section === 'settings' && <AdminSettings />}
          {section === 'logs' && <AdminLogs />}
        </motion.div>
      </AdminErrorBoundary>
    </div>
  )
}

// Map tab keys to their i18n label keys
function tabLabelKey(tabKey: string): any {
  const map: Record<string, string> = {
    dashboard: 'adminDashboard',
    users: 'userManagement',
    admins: 'adminManagement',
    plans: 'miningManagement',
    payments: 'paymentManagement',
    wallets: 'networks',
    tickets: 'supportTickets',
    settings: 'platformSettings',
    logs: 'securityLogs',
  }
  return map[tabKey] || tabKey
}
