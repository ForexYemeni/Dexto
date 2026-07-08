'use client'

import { useEffect, useState } from 'react'

// Helper to get current time in Mecca timezone (Asia/Riyadh)
export function useMeccaTime() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return now
}

// Format date in Mecca timezone
export function formatMeccaTime(date: Date | string, locale: 'ar' | 'en' = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d)
  } catch {
    return d.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')
  }
}

export function formatMeccaTimeShort(date: Date | string, locale: 'ar' | 'en' = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      timeZone: 'Asia/Riyadh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d)
  } catch {
    return d.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US')
  }
}

// Countdown timer
export function useCountdown(targetDate: Date | string) {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const diff = Math.max(0, target.getTime() - now)
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const progress = 1 - diff / (target.getTime() - (target.getTime() - 24 * 60 * 60 * 1000))
  // Actually calculate progress based on session duration
  // We'll pass duration separately

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: diff === 0,
    formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  }
}

// Countdown with progress
export function useCountdownWithProgress(startedAt: Date | string, endsAt: Date | string) {
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt
  const end = typeof endsAt === 'string' ? new Date(endsAt) : endsAt
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const totalDuration = end.getTime() - start.getTime()
  const elapsed = now - start.getTime()
  const remaining = Math.max(0, end.getTime() - now)
  const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))

  const totalSeconds = Math.floor(remaining / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: remaining === 0,
    progressPercent,
    formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  }
}

export function formatCurrency(amount: number, locale: 'ar' | 'en' = 'ar'): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num: number, locale: 'ar' | 'en' = 'ar'): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(num)
}

export function timeAgo(date: Date | string, locale: 'ar' | 'en' = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)

  if (seconds < 60) return locale === 'ar' ? 'الآن' : 'just now'
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    return locale === 'ar' ? `منذ ${m} دقيقة` : `${m} min ago`
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600)
    return locale === 'ar' ? `منذ ${h} ساعة` : `${h}h ago`
  }
  const days = Math.floor(seconds / 86400)
  return locale === 'ar' ? `منذ ${days} يوم` : `${days}d ago`
}
