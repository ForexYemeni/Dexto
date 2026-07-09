import "./globals.css";
import type { Metadata, Viewport } from "next";

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Dexto - Crypto Mining Investment Platform",
  description: "Premium Crypto Mining & Investment Platform - Professional USDT Mining with Daily Returns",
  keywords: ["crypto", "mining", "investment", "USDT", "bitcoin", "cryptocurrency", "Dexto"],
  authors: [{ name: "Dexto Platform" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dexto",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Dexto - Crypto Mining Investment Platform",
    description: "Premium Crypto Mining & Investment Platform - Professional USDT Mining with Daily Returns",
    type: "website",
    images: ["/icon-512.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dexto - Crypto Mining Platform",
    description: "Professional USDT Mining with Daily Returns",
    images: ["/icon-512.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Dexto" />
        <meta name="application-name" content="Dexto" />
        <meta name="msapplication-TileColor" content="#0a0a1a" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
