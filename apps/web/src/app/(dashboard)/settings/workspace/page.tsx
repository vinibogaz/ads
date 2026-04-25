import type { Metadata } from 'next'
import { CreateWorkspaceView } from '@/components/workspace/CreateWorkspaceView'

export const metadata: Metadata = { title: 'Criar Workspace' }

export default function CreateWorkspacePage() {
  return <CreateWorkspaceView />
}
