import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgentDID — Decentralized Identity for AI Agents',
  description: 'Open protocol for AI agent & robot identity. Non-commercial. Cross-border. Community governed.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
