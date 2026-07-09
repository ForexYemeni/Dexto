import "./globals.css";

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
