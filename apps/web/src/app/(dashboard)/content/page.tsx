import type { Metadata } from 'next'
import { ContentEngineView } from '@/components/content/ContentEngineView'

export const metadata: Metadata = { title: 'Content Engine' }

export default function ContentPage() {
  return <ContentEngineView />
}
