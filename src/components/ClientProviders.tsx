'use client'

import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'

export function ClientProviders() {
  return (
    <>
      <Toaster />
      <Sonner />
    </>
  )
}
