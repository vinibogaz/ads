import type { Metadata } from 'next'
import { GeoActionPlanView } from '@/components/geo/GeoActionPlanView'

export const metadata: Metadata = { title: 'Plano de Ação — GEO Monitor' }

export default function GeoActionPlansPage() {
  return <GeoActionPlanView />
}
