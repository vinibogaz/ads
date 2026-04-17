import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ORFFIA — Marketing Intelligence Hub',
    template: '%s | ORFFIA',
  },
  description:
    'Plataforma de inteligência de marketing com IA. SEO, GEO Monitor, geração de conteúdo e muito mais.',
  keywords: ['SEO', 'GEO', 'marketing', 'IA', 'conteúdo', 'SaaS'],
  authors: [{ name: 'ORFFIA' }],
  robots: { index: false, follow: false }, // private app
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-orf-bg text-orf-text font-sans antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
