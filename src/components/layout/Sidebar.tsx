'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useUIStore, useAuthStore, useNotificationStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Pickaxe, ArrowDownToLine, ArrowUpFromLine,
  Wallet, Users, CheckSquare, Bell, LifeBuoy, HelpCircle,
  FileText, ShieldCheck, LogOut, X, Bitcoin, Globe,
  Moon, Sun, User, Settings as SettingsIcon, DollarSign,
  Activity,
} from 'lucide-react'
import { formatCurrency } from '@/lib/time-utils'

interface NavItem {
  view: string
  label: string
  icon: React.ReactNode
  badge?: number
}

export function Sidebar() {
  const { t, isRTL, locale } = useI18n()
  const { view, setView, sidebarOpen, setSidebarOpen } = useUIStore()
  const { user } = useAuthStore()
  const { unreadCount, setNotifications } = useNotificationStore()
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const logout = useAuthStore((s) => s.logout)

  // Auto-poll notifications every 15 seconds
  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.notifications) {
            setNotifications(data.notifications)
          }
        }
      } catch (e) {
        // silent fail
      }
    }

    // Fetch immediately
    fetchNotifications()

    // Poll every 15 seconds
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [user?.id, setNotifications])

  // Fetch platform name dynamically
  const [platformName, setPlatformName] = useState<string>('')
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.platformName) {
          setPlatformName(locale === 'ar' ? (data.platformNameAr || data.platformName) : data.platformName)
        }
      })
      .catch(() => {})
  }, [locale])

  // Admin navigation - ONLY admin sections
  const adminNav: NavItem[] = [
    { view: 'admin', label: t('adminDashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { view: 'admin_users', label: t('userManagement'), icon: <Users className="w-5 h-5" /> },
    { view: 'admin_plans', label: t('miningManagement'), icon: <Pickaxe className="w-5 h-5" /> },
    { view: 'admin_payments', label: t('paymentManagement'), icon: <DollarSign className="w-5 h-5" /> },
    { view: 'admin_wallets', label: t('networks'), icon: <Wallet className="w-5 h-5" /> },
    { view: 'admin_tasks', label: t('tasks'), icon: <CheckSquare className="w-5 h-5" /> },
    { view: 'admin_tickets', label: t('supportTickets'), icon: <LifeBuoy className="w-5 h-5" /> },
    { view: 'admin_settings', label: t('platformSettings'), icon: <SettingsIcon className="w-5 h-5" /> },
    { view: 'admin_logs', label: t('securityLogs'), icon: <ShieldCheck className="w-5 h-5" /> },
  ]

  // User navigation - only shown for regular users
  const userNav: NavItem[] = [
    { view: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { view: 'mining', label: t('mining'), icon: <Pickaxe className="w-5 h-5" /> },
    { view: 'deposit', label: t('deposit'), icon: <ArrowDownToLine className="w-5 h-5" /> },
    { view: 'withdrawal', label: t('withdrawal'), icon: <ArrowUpFromLine className="w-5 h-5" /> },
    { view: 'wallet', label: t('wallet'), icon: <Wallet className="w-5 h-5" /> },
    { view: 'referrals', label: t('referrals'), icon: <Users className="w-5 h-5" /> },
    { view: 'tasks', label: t('tasks'), icon: <CheckSquare className="w-5 h-5" /> },
    { view: 'notifications', label: t('notifications'), icon: <Bell className="w-5 h-5" />, badge: unreadCount },
    { view: 'support', label: t('support'), icon: <LifeBuoy className="w-5 h-5" /> },
    { view: 'faq', label: t('faq'), icon: <HelpCircle className="w-5 h-5" /> },
    { view: 'terms', label: t('terms'), icon: <FileText className="w-5 h-5" /> },
    { view: 'privacy', label: t('privacy'), icon: <ShieldCheck className="w-5 h-5" /> },
    { view: 'profile', label: t('profile'), icon: <User className="w-5 h-5" /> },
  ]

  const isAdmin = user?.role === 'admin'
  const nav = isAdmin ? adminNav : userNav

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    logout()
    setView('login')
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 ${isRTL ? 'right-0' : 'left-0'} h-screen w-72 z-50 glass-strong border-${isRTL ? 'l' : 'r'} border-white/10 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-amber-500 flex items-center justify-center glow-electric shrink-0">
              <img src="/icon-192.png" alt="Dexto" className="w-8 h-8 rounded-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-white truncate">
                {platformName || (locale === 'ar' ? 'منصة التعدين' : 'Mining Platform')}
              </h1>
              <p className="text-[10px] text-white/50 truncate">
                {isAdmin ? (locale === 'ar' ? 'لوحة الإدارة' : 'Admin Panel') : '2026 Premium'}
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Balance card - only for regular users */}
        {!isAdmin && user && (
          <div className="p-4">
            <div className="glass rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl" />
              <p className="text-[10px] text-white/60 mb-1">{t('balance')}</p>
              <p className="text-2xl font-bold gradient-text-electric tabular-nums">
                {formatCurrency(user.balance, locale)}
              </p>
              <p className="text-xs text-white/40 mt-1">USDT</p>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto custom-scroll px-3 pb-4">
          <div className="mb-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40 px-3 py-2">
              {isAdmin ? (locale === 'ar' ? 'الإدارة' : 'Administration') : (locale === 'ar' ? 'القائمة' : 'Menu')}
            </p>
            {nav.map((item) => (
              <NavButton
                key={item.view}
                item={item}
                active={view === item.view}
                onClick={() => setView(item.view as any)}
                badge={item.badge}
                isRTL={isRTL}
              />
            ))}
          </div>
        </nav>

        {/* Footer controls */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => useUIStore.getState().toggleLocale()}
              className="flex-1 glass rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 text-xs text-white/80 hover:bg-white/10 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {locale === 'ar' ? 'EN' : 'ع'}
            </button>
            <button
              onClick={toggleTheme}
              className="flex-1 glass rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 text-xs text-white/80 hover:bg-white/10 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? (locale === 'ar' ? 'فاتح' : 'Light') : (locale === 'ar' ? 'داكن' : 'Dark')}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full glass rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('logout')}
          </button>
        </div>
      </aside>
    </>
  )
}

function NavButton({ item, active, onClick, badge, isRTL }: { item: NavItem; active: boolean; onClick: () => void; badge?: number; isRTL: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1 group relative ${
        active
          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white border border-blue-500/30'
          : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      {active && (
        <motion.div
          layoutId="active-nav"
          className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full`}
        />
      )}
      <span className={active ? 'text-blue-400' : 'text-white/60 group-hover:text-white'}>{item.icon}</span>
      <span className="text-sm flex-1 text-start">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </button>
  )
}

export function TopBar() {
  const { t, isRTL, locale } = useI18n()
  const { setSidebarOpen, view } = useUIStore()
  const { user } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const setView = useUIStore((s) => s.setView)
  const isAdmin = user?.role === 'admin'

  const titleMap: Record<string, string> = {
    dashboard: t('dashboard'),
    mining: t('mining'),
    deposit: t('deposit'),
    withdrawal: t('withdrawal'),
    wallet: t('wallet'),
    referrals: t('referrals'),
    tasks: t('tasks'),
    notifications: t('notifications'),
    support: t('support'),
    faq: t('faq'),
    terms: t('terms'),
    privacy: t('privacy'),
    profile: t('profile'),
    admin: t('adminDashboard'),
    admin_users: t('userManagement'),
    admin_plans: t('miningManagement'),
    admin_payments: t('paymentManagement'),
    admin_wallets: t('networks'),
    admin_tickets: t('supportTickets'),
    admin_tasks: t('tasks'),
    admin_settings: t('platformSettings'),
    admin_logs: t('securityLogs'),
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden glass rounded-xl p-2 text-white"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">{titleMap[view] || ''}</h2>
          <p className="text-[10px] text-white/40">
            {new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications bell - show for BOTH admin and users */}
        <button
          onClick={() => setView('notifications')}
          className="relative glass rounded-xl p-2.5 text-white hover:bg-white/10 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="glass rounded-xl p-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block pe-2">
            <p className="text-xs font-medium text-white">{user?.name}</p>
            <p className="text-[10px] text-white/40">
              {isAdmin ? (locale === 'ar' ? 'مدير' : 'Admin') : user?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
