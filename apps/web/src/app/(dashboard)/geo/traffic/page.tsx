import type { Metadata } from 'next'
import { GeoTrafficView } from '@/components/geo/GeoTrafficView'

export const metadata: Metadata = { title: 'GEO Monitor — AI Traffic Analytics' }

export default function GeoTrafficPage() {
  return <GeoTrafficView />
}
