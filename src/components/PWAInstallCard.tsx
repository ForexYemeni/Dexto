'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone, Shield, Zap, Bitcoin } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showCard, setShowCard] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if dismissed before (sessionStorage)
    const dismissedSession = sessionStorage.getItem('pwa-dismissed')
    if (dismissedSession === 'true') {
      setDismissed(true)
      return
    }

    // Listen for beforeinstallprompt (Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Always show the install card after 5 seconds (for all browsers)
    // unless already installed or dismissed
    if (!isInstalled && !dismissed) {
      setTimeout(() => setShowCard(true), 5000)
    }

    // Listen for appinstalled
    const installedHandler = () => {
      setIsInstalled(true)
      setShowCard(false)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Edge/Android - use native install prompt
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setIsInstalled(true)
        setShowCard(false)
      }
      setDeferredPrompt(null)
    } else {
      // Check if actually iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        // Show iOS instructions
        setShowCard(false)
        setShowIOSInstructions(true)
      } else {
        // Desktop/other - show generic instructions
        setShowCard(false)
        setShowIOSInstructions(true)
      }
    }
  }

  const handleDismiss = () => {
    setShowCard(false)
    setDismissed(true)
    sessionStorage.setItem('pwa-dismissed', 'true')
  }

  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  if (isInstalled || dismissed) return null

  return (
    <>
      {/* PWA Install Card */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4"
          >
            <div className="glass-strong rounded-3xl p-5 border border-blue-500/30 shadow-2xl shadow-blue-500/20 relative overflow-hidden">
              {/* Background gradient */}
              <div className="absolute inset-0 gradient-mesh opacity-20" />
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1.5 rounded-lg glass text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-amber-500 flex items-center justify-center shrink-0 glow-electric">
                    <img src="/icon-192.png" alt="Dexto" className="w-12 h-12 rounded-xl" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {typeof window !== 'undefined' && document.documentElement.lang === 'ar'
                        ? 'تثبيت تطبيق Dexto'
                        : 'Install Dexto App'}
                    </h3>
                    <p className="text-[11px] text-white/50">
                      {typeof window !== 'undefined' && document.documentElement.lang === 'ar'
                        ? 'وصول سريع من شاشتك الرئيسية'
                        : 'Quick access from your home screen'}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="glass rounded-xl p-2 text-center">
                    <Zap className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                    <p className="text-[9px] text-white/60">
                      {typeof window !== 'undefined' && document.documentElement.lang === 'ar' ? 'سريع' : 'Fast'}
                    </p>
                  </div>
                  <div className="glass rounded-xl p-2 text-center">
                    <Shield className="w-4 h-4 mx-auto text-green-400 mb-1" />
                    <p className="text-[9px] text-white/60">
                      {typeof window !== 'undefined' && document.documentElement.lang === 'ar' ? 'آمن' : 'Secure'}
                    </p>
                  </div>
                  <div className="glass rounded-xl p-2 text-center">
                    <Smartphone className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                    <p className="text-[9px] text-white/60">
                      {typeof window !== 'undefined' && document.documentElement.lang === 'ar' ? 'يعمل بلا اتصال' : 'Offline'}
                    </p>
                  </div>
                </div>

                {/* Install button */}
                <button
                  onClick={handleInstall}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {typeof window !== 'undefined' && document.documentElement.lang === 'ar'
                    ? 'تثبيت التطبيق'
                    : 'Install App'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Modal - dynamic based on device */}
      <AnimatePresence>
        {showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowIOSInstructions(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-sm border border-blue-500/30"
            >
              {(() => {
                const isAr = typeof window !== 'undefined' && document.documentElement.lang === 'ar'
                const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
                const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent)

                if (isIOS) {
                  return (
                    <>
                      <div className="text-center mb-5">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-3 glow-electric">
                          <Download className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">
                          {isAr ? 'تثبيت على iPhone' : 'Install on iPhone'}
                        </h3>
                        <p className="text-xs text-white/50">
                          {isAr ? 'اتبع هذه الخطوات' : 'Follow these steps'}
                        </p>
                      </div>
                      <div className="space-y-3 mb-5">
                        <div className="flex items-start gap-3 glass rounded-xl p-3">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
                          <p className="text-xs text-white">{isAr ? 'اضغط زر المشاركة (مربع بسهم)' : 'Tap the Share button (square with arrow)'}</p>
                        </div>
                        <div className="flex items-start gap-3 glass rounded-xl p-3">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
                          <p className="text-xs text-white">{isAr ? 'اختر "إضافة إلى الشاشة الرئيسية"' : 'Select "Add to Home Screen"'}</p>
                        </div>
                        <div className="flex items-start gap-3 glass rounded-xl p-3">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
                          <p className="text-xs text-white">{isAr ? 'اضغط "إضافة" - سيظهر التطبيق على شاشتك' : 'Tap "Add" - app will appear on your screen'}</p>
                        </div>
                      </div>
                    </>
                  )
                }

                if (isAndroid) {
                  return (
                    <>
                      <div className="text-center mb-5">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-3 glow-electric">
                          <Download className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">
                          {isAr ? 'تثبيت على Android' : 'Install on Android'}
                        </h3>
                        <p className="text-xs text-white/50">
                          {isAr ? 'اتبع هذه الخطوات' : 'Follow these steps'}
                        </p>
                      </div>
                      <div className="space-y-3 mb-5">
                        <div className="flex items-start gap-3 glass rounded-xl p-3">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
                          <p className="text-xs text-white">{isAr ? 'اضغط على قائمة المتصفح (ثلاث نقاط)' : 'Tap browser menu (three dots)'}</p>
                        </div>
                        <div className="flex items-start gap-3 glass rounded-xl p-3">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
                          <p className="text-xs text-white">{isAr ? 'اختر "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية"' : 'Select "Install app" or "Add to Home screen"'}</p>
                        </div>
                        <div className="flex items-start gap-3 glass rounded-xl p-3">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
                          <p className="text-xs text-white">{isAr ? 'اضغط "تثبيت" - سيظهر التطبيق على شاشتك' : 'Tap "Install" - app will appear on your screen'}</p>
                        </div>
                      </div>
                    </>
                  )
                }

                // Desktop
                return (
                  <>
                    <div className="text-center mb-5">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-3 glow-electric">
                        <Download className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        {isAr ? 'تثبيت التطبيق' : 'Install App'}
                      </h3>
                      <p className="text-xs text-white/50">
                        {isAr ? 'اتبع هذه الخطوات' : 'Follow these steps'}
                      </p>
                    </div>
                    <div className="space-y-3 mb-5">
                      <div className="flex items-start gap-3 glass rounded-xl p-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
                        <p className="text-xs text-white">{isAr ? 'ابحث عن أيقونة التثبيت في شريط المتصفح' : 'Look for install icon in the browser address bar'}</p>
                      </div>
                      <div className="flex items-start gap-3 glass rounded-xl p-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
                        <p className="text-xs text-white">{isAr ? 'أو اضغط قائمة المتصفح (ثلاث نقاط) → "تثبيت Dexto"' : 'Or browser menu (three dots) → "Install Dexto"'}</p>
                      </div>
                      <div className="flex items-start gap-3 glass rounded-xl p-3">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
                        <p className="text-xs text-white">{isAr ? 'سيظهر التطبيق كأيقونة مستقلة على سطح المكتب' : 'App will appear as standalone icon on your desktop'}</p>
                      </div>
                    </div>
                  </>
                )
              })()}
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold"
              >
                {typeof window !== 'undefined' && document.documentElement.lang === 'ar' ? 'فهمت' : 'Got it'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
