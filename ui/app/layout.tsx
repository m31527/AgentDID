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
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-3QCMJKFC29"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-3QCMJKFC29');
        `}
      </Script>

      {/* Firebase Analytics */}
      <Script id="firebase-analytics" type="module" strategy="afterInteractive">
        {`
          import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
          import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js';
          const firebaseConfig = {
            apiKey: "AIzaSyAfVoZ9gp_iAEjijHXNLY1zCwL15sk8yuA",
            authDomain: "agentdid.firebaseapp.com",
            projectId: "agentdid",
            storageBucket: "agentdid.firebasestorage.app",
            messagingSenderId: "25091879565",
            appId: "1:25091879565:web:1b340d0bff5580c94928c4",
            measurementId: "G-3QCMJKFC29"
          };
          const app = initializeApp(firebaseConfig);
          getAnalytics(app);
        `}
      </Script>
    </html>
  )
}
