import type { Metadata } from 'next'
import { GeoDiagnosticView } from '@/components/geo/GeoDiagnosticView'

export const metadata: Metadata = { title: 'Diagnóstico GEO — GEO Monitor' }

export default function GeoDiagnosticPage() {
  return <GeoDiagnosticView />
}
