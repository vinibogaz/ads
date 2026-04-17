import type { Metadata } from 'next'
import { GeoMonitorsView } from '@/components/geo/GeoMonitorsView'

export const metadata: Metadata = { title: 'GEO Monitor' }

export default function GeoPage() {
  return <GeoMonitorsView />
}
