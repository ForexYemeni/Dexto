'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div>حدث خطأ. يرجى تحديث الصفحة.</div>
      </body>
    </html>
  )
}
