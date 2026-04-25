import type { Metadata } from 'next'
import { WorkspaceMembersView } from '@/components/workspace/WorkspaceMembersView'

export const metadata: Metadata = { title: 'Membros do Workspace' }

export default function MembersPage() {
  return <WorkspaceMembersView />
}
