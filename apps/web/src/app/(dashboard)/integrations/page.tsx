import { Suspense } from 'react'
import { IntegrationsView } from '@/components/integrations/IntegrationsView'

export default function IntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <IntegrationsView />
    </Suspense>
  )
}
