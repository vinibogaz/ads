import type { Metadata } from 'next'
import { GeoPromptsView } from '@/components/geo/GeoPromptsView'

export const metadata: Metadata = { title: 'Prompts Monitorados — GEO Monitor' }

export default function GeoPromptsPage() {
  return <GeoPromptsView />
}
