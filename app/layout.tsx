import type { Metadata, Viewport } from 'next'
import { Cinzel, Barlow } from 'next/font/google'
import { SessionProvider } from '@/components/SessionProvider'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-cinzel',
  display: 'swap',
})

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'GeoConquest',
    template: '%s | GeoConquest',
  },
  description:
    'A daily geography conquest game. Name your neighbors, answer trivia, and expand your empire across the world map.',
  metadataBase: new URL(
    process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  ),
  openGraph: {
    title: 'GeoConquest',
    description: 'Conquer the world, one neighbor at a time.',
    type: 'website',
    siteName: 'GeoConquest',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GeoConquest',
    description: 'Conquer the world, one neighbor at a time.',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1510',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${barlow.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
