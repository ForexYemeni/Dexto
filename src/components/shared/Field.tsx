'use client'

import { Eye, EyeOff, Mail, Lock, User, Phone, Gift, ShieldCheck, Sparkles, TrendingUp, Globe, Moon, Sun, ArrowRight, ArrowLeft, CheckCircle2, Loader2, Bitcoin } from 'lucide-react'
import { useState } from 'react'

export function Field({
  icon,
  placeholder,
  value,
  onChange,
  error,
  type = 'text',
  isRTL = false,
}: {
  icon: React.ReactNode
  placeholder: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  isRTL?: boolean
}) {
  return (
    <div>
      <div className="relative">
        <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} text-white/40`}>
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white/5 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-3.5 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all`}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

export { Eye, EyeOff, Mail, Lock, User, Phone, Gift, ShieldCheck, Sparkles, TrendingUp, Globe, Moon, Sun, ArrowRight, ArrowLeft, CheckCircle2, Loader2, Bitcoin }
