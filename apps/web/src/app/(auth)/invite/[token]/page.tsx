import type { Metadata } from 'next'
import { InviteAcceptView } from '@/components/workspace/InviteAcceptView'

export const metadata: Metadata = { title: 'Aceitar Convite — Orffia Ads' }

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <InviteAcceptView token={token} />
}
