import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Locale } from './i18n'

// ===== Auth Store (client-side) =====
interface AuthUser {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  balance: number
  language: Locale
  referralCode: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  logout: () => void
  updateUser: (partial: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'cmip-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// ===== UI Store (language, theme, view routing) =====
type ViewKey =
  | 'dashboard'
  | 'mining'
  | 'deposit'
  | 'withdrawal'
  | 'wallet'
  | 'referrals'
  | 'tasks'
  | 'notifications'
  | 'support'
  | 'faq'
  | 'terms'
  | 'privacy'
  | 'profile'
  | 'admin'
  | 'admin_users'
  | 'admin_plans'
  | 'admin_payments'
  | 'admin_wallets'
  | 'admin_tickets'
  | 'admin_settings'
  | 'admin_logs'
  | 'login'
  | 'register'
  | 'forgot'

interface UIState {
  locale: Locale
  theme: 'dark' | 'light'
  view: ViewKey
  adminSubView: string
  sidebarOpen: boolean
  setLocale: (locale: Locale) => void
  setTheme: (theme: 'dark' | 'light') => void
  toggleLocale: () => void
  toggleTheme: () => void
  setView: (view: ViewKey) => void
  setAdminSubView: (view: string) => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      locale: 'ar',
      theme: 'dark',
      view: 'login',
      adminSubView: 'dashboard',
      sidebarOpen: false,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      toggleLocale: () => set((s) => ({ locale: s.locale === 'ar' ? 'en' : 'ar' })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setView: (view) => set({ view, sidebarOpen: false }),
      setAdminSubView: (adminSubView) => set({ adminSubView }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    {
      name: 'cmip-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// ===== Notifications Store (real-time via socket) =====
interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  setNotifications: (items: NotificationItem[]) => void
  addNotification: (item: NotificationItem) => void
  markAllRead: () => void
  markAsRead: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (items) =>
    set({ notifications: items, unreadCount: items.filter((i) => !i.isRead).length }),
  addNotification: (item) =>
    set((s) => ({
      notifications: [item, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
  markAsRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      )
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length,
      }
    }),
}))

// ===== Toast Store =====
interface ToastItem {
  id: string
  title: string
  description?: string
  variant: 'default' | 'success' | 'error' | 'warning'
}

interface ToastState {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
