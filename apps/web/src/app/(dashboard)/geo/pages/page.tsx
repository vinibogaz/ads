import type { Metadata } from 'next'
import { GeoPagesView } from '@/components/geo/GeoPagesView'

export const metadata: Metadata = { title: 'Páginas Monitoradas — GEO Monitor' }

export default function GeoPagesPage() {
  return <GeoPagesView />
}
