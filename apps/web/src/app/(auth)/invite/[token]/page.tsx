import type { Metadata } from 'next'
import { InviteAcceptView } from '@/components/workspace/InviteAcceptView'

export const metadata: Metadata = { title: 'Aceitar Convite — Orffia Ads' }

export default function InvitePage({ params }: { params: { token: string } }) {
  return <InviteAcceptView token={params.token} />
}
