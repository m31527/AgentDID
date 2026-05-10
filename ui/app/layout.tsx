import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgentDID — Decentralized Identity for AI Agents',
  description: 'Open protocol for AI agent & robot identity. Non-commercial. Cross-border. Community governed.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'AgentDID — Decentralized Identity for AI Agents',
    description: 'Non-commercial open protocol for AI agent & robot identity.',
    images: ['/logo.png'],
  },
}

const GA_ID       = process.env.NEXT_PUBLIC_GA_ID       ?? ''
const FB_API_KEY  = process.env.NEXT_PUBLIC_FIREBASE_API_KEY  ?? ''
const FB_APP_ID   = process.env.NEXT_PUBLIC_FIREBASE_APP_ID   ?? ''
const FB_MSG_ID   = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? ''

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body className="min-h-screen bg-white text-gray-900">{children}</body>

      {/* Google Analytics (GA4) */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}

      {/* Firebase Analytics */}
      {FB_API_KEY && (
        <Script id="firebase-analytics" type="module" strategy="afterInteractive">
          {`
            import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
            import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js';
            const app = initializeApp({
              apiKey:            '${FB_API_KEY}',
              authDomain:        'agentdid.firebaseapp.com',
              projectId:         'agentdid',
              storageBucket:     'agentdid.firebasestorage.app',
              messagingSenderId: '${FB_MSG_ID}',
              appId:             '${FB_APP_ID}',
              measurementId:     '${GA_ID}'
            });
            getAnalytics(app);
          `}
        </Script>
      )}
    </html>
  )
}
