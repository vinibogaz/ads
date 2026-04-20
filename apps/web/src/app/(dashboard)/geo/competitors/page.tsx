import type { Metadata } from 'next'
import { GeoCompetitorsView } from '@/components/geo/GeoCompetitorsView'

export const metadata: Metadata = { title: 'Concorrentes — GEO Monitor' }

export default function GeoCompetitorsPage() {
  return <GeoCompetitorsView />
}
