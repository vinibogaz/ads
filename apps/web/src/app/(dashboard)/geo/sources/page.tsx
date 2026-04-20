import type { Metadata } from 'next'
import { GeoSourcesView } from '@/components/geo/GeoSourcesView'

export const metadata: Metadata = { title: 'Fontes Citadas — GEO Monitor' }

export default function GeoSourcesPage() {
  return <GeoSourcesView />
}
