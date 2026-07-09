'use client'

import { useEffect, useState } from 'react'
import { useAuthStore, useUIStore } from '@/lib/store'
import { useI18n } from '@/hooks/use-i18n'
import AuthPage from '@/components/auth/AuthPage'
import { Sidebar, TopBar } from '@/components/layout/Sidebar'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { MiningView } from '@/components/mining/MiningView'
import { DepositView } from '@/components/deposit/DepositView'
import { WithdrawalView } from '@/components/withdrawal/WithdrawalView'
import { WalletView } from '@/components/wallet/WalletView'
import { ReferralsView } from '@/components/referrals/ReferralsView'
import { TasksView } from '@/components/tasks/TasksView'
import { NotificationsView } from '@/components/notifications/NotificationsView'
import { SupportView } from '@/components/support/SupportView'
import { LegalView, ProfileView } from '@/components/legal/LegalViews'
import { AdminView } from '@/components/admin/AdminView'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { AdminUsers } from '@/components/admin/AdminUsers'
import { AdminPlans } from '@/components/admin/AdminPlans'
import { AdminPayments } from '@/components/admin/AdminPayments'
import { AdminWallets } from '@/components/admin/AdminWallets'
import { AdminTickets } from '@/components/admin/AdminTickets'
import { AdminSettings } from '@/components/admin/AdminSettings'
import { AdminLogs } from '@/components/admin/AdminLogs'
import { initSocket } from '@/lib/socket-client'
import { Toaster as ShadcnToaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'

export default function Home() {
  const { isRTL, locale } = useI18n()
  const { isAuthenticated, user } = useAuthStore()
  const { view, theme } = useUIStore()
  const [authChecked, setAuthChecked] = useState(false)

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Apply direction
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
  }, [isRTL, locale])

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth', { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            useAuthStore.getState().setUser(data.user)
            useUIStore.getState().setLocale(data.user.language || 'ar')
            useUIStore.getState().setTheme(data.user.theme || 'dark')
            // Set initial view based on role
            if (useUIStore.getState().view === 'login') {
              useUIStore.getState().setView(data.user.role === 'admin' ? 'admin' : 'dashboard')
            }
          }
        }
      } catch {}
      setAuthChecked(true)
    }
    checkAuth()
  }, [])

  // Initialize socket when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      initSocket(user.id)
    }
  }, [isAuthenticated, user?.id])

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Not authenticated - show auth page
  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <ShadcnToaster />
        <SonnerToaster />
      </>
    )
  }

  // Render current view
  const renderView = () => {
    // Admin views - only accessible to admins
    if (user?.role === 'admin') {
      switch (view) {
        case 'admin': return <AdminDashboard />
        case 'admin_users': return <AdminUsers />
        case 'admin_plans': return <AdminPlans />
        case 'admin_payments': return <AdminPayments />
        case 'admin_wallets': return <AdminWallets />
        case 'admin_tickets': return <AdminTickets />
        case 'admin_settings': return <AdminSettings />
        case 'admin_logs': return <AdminLogs />
        default: return <AdminDashboard />
      }
    }

    // User views
    switch (view) {
      case 'dashboard': return <DashboardView />
      case 'mining': return <MiningView />
      case 'deposit': return <DepositView />
      case 'withdrawal': return <WithdrawalView />
      case 'wallet': return <WalletView />
      case 'referrals': return <ReferralsView />
      case 'tasks': return <TasksView />
      case 'notifications': return <NotificationsView />
      case 'support': return <SupportView />
      case 'faq': return <LegalView type="faq" />
      case 'terms': return <LegalView type="terms" />
      case 'privacy': return <LegalView type="privacy" />
      case 'profile': return <ProfileView />
      default: return <DashboardView />
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
        {/* Background mesh */}
        <div className="fixed inset-0 gradient-mesh opacity-30 pointer-events-none" />

        <div className="relative flex">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <TopBar />
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
              {renderView()}
            </div>
          </main>
        </div>
      </div>
      <ShadcnToaster />
      <SonnerToaster />
    </>
  )
}
