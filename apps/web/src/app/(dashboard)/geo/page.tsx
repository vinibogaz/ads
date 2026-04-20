import type { Metadata } from 'next'
import { GeoDashboard } from '@/components/geo/GeoDashboard'

export const metadata: Metadata = { title: 'GEO Monitor — Dashboard' }

export default function GeoPage() {
  return <GeoDashboard />
}
