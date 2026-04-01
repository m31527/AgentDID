import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgentDID — Decentralized Identity for AI Agents',
  description: 'Open protocol for AI agent & robot identity. Non-commercial. Cross-border. Community governed.',
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
    </html>
  )
}
