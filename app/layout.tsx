import type { Metadata, Viewport } from 'next'
import type { ReactNode } from "react";
import SwMessageBridge from "./sw-message-bridge";
import './globals.css'

export const metadata: Metadata = {
  title: 'CareBridge Hub',
  description: '介護・福祉向け情報共有アプリ',
  icons: {
    icon: [
      { url: '/assets/icon/favicon.ico', sizes: 'any' },
      { url: '/assets/icon/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/assets/icon/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/assets/icon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CareBridge Hub',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <SwMessageBridge />
        {children}
      </body>
    </html>
  )
}


