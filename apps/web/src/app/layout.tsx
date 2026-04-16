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
    default: 'Synthex — Marketing Intelligence Hub',
    template: '%s | Synthex',
  },
  description:
    'Plataforma de inteligência de marketing com IA. SEO, GEO Monitor, geração de conteúdo e muito mais.',
  keywords: ['SEO', 'GEO', 'marketing', 'IA', 'conteúdo', 'SaaS'],
  authors: [{ name: 'Synthex' }],
  robots: { index: false, follow: false }, // private app
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-sx-bg text-sx-text font-sans antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
