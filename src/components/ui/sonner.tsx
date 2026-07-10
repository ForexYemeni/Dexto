"use client"

import { useI18n } from "@/hooks/use-i18n"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { locale } = useI18n()
  return (
    <Sonner
      theme="dark"
      position={locale === 'ar' ? 'bottom-left' : 'bottom-right'}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: 'rgba(15, 20, 40, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          backdropFilter: 'blur(20px)',
          borderRadius: '12px',
        },
        classNames: {
          success: 'border-green-500/30 bg-green-950/95',
          error: 'border-red-500/30 bg-red-950/95',
          warning: 'border-amber-500/30 bg-amber-950/95',
          info: 'border-blue-500/30 bg-blue-950/95',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
