'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

type Member = {
  id: string
  userId: string
  name: string
  email: string
  avatarUrl?: string
  role: string
  joinedAt: string
  isCurrentUser: boolean
}

type PendingInvite = {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

type MembersData = {
  members: Member[]
  pending: PendingInvite[]
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Visualizador',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-500/10 text-purple-400',
  admin: 'bg-blue-500/10 text-blue-400',
  editor: 'bg-green-500/10 text-green-400',
  viewer: 'bg-gray-500/10 text-gray-400',
}

const inputCls = 'w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary'

export function WorkspaceMembersView() {
  const queryClient = useQueryClient()
  const { user, workspaces } = useAuthStore()
  const activeWorkspace = workspaces.find((w) => w.id === user?.tid)
  const isAdmin = ['owner', 'admin'].includes(user?.role ?? '')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-members', user?.tid],
    queryFn: () => api<MembersData>(`/workspaces/${user?.tid}/members`),
    enabled: !!user?.tid,
  })

  const members: Member[] = data?.data?.members ?? []
  const pending: PendingInvite[] = data?.data?.pending ?? []

  const invite = useMutation({
    mutationFn: () =>
      api<{ inviteUrl: string; email: string }>(`/workspaces/${user?.tid}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      }),
    onSuccess: (res) => {
      setInviteUrl(res.data.inviteUrl)
      setInviteEmail('')
      setInviteError('')
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] })
    },
    onError: (e: any) => setInviteError(e.message ?? 'Erro ao convidar'),
  })

  const [cancelError, setCancelError] = useState('')

  const cancelInvite = useMutation({
    mutationFn: (inviteId: string) =>
      api(`/workspaces/${user?.tid}/invites/${inviteId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] })
      setCancelError('')
    },
    onError: (e: any) => setCancelError(e.message ?? 'Erro ao cancelar convite'),
  })

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api(`/workspaces/${user?.tid}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-members'] }),
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      api(`/workspaces/${user?.tid}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-members'] }),
  })

  const copyInvite = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea')
      el.value = inviteUrl
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-orf-text">Membros do Workspace</h1>
        <p className="text-sm text-orf-text-2 mt-0.5">
          {activeWorkspace?.name} · {members.length} membro{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Invite form */}
      {isAdmin && (
        <div className="bg-orf-surface border border-orf-border rounded-orf p-5 space-y-4">
          <h2 className="text-sm font-semibold text-orf-text">Convidar membro</h2>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className={`${inputCls} flex-1`}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text focus:outline-none focus:border-orf-primary"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Visualizador</option>
            </select>
            <button
              onClick={() => invite.mutate()}
              disabled={!inviteEmail.trim() || invite.isPending}
              className="px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50 whitespace-nowrap"
            >
              {invite.isPending ? 'Gerando...' : 'Convidar'}
            </button>
          </div>
          {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
      {cancelError && <p className="text-xs text-red-400 mt-1">{cancelError}</p>}

          {inviteUrl && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-orf-sm p-3 space-y-2">
              <p className="text-xs text-emerald-400 font-medium">Link de convite gerado! Envie para o convidado:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-orf-surface px-2 py-1.5 rounded text-orf-text font-mono truncate border border-orf-border">
                  {inviteUrl}
                </code>
                <button
                  onClick={copyInvite}
                  className="px-3 py-1.5 bg-orf-primary text-white rounded text-xs font-medium whitespace-nowrap"
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="text-xs text-orf-text-3">O link expira em 7 dias.</p>
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="bg-orf-surface border border-orf-border rounded-orf overflow-hidden">
        <div className="px-5 py-4 border-b border-orf-border">
          <h2 className="text-sm font-semibold text-orf-text">Membros ativos</h2>
        </div>
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-orf-text-2">Carregando...</div>
        ) : (
          <div className="divide-y divide-orf-border">
            {members.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orf-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-orf-primary text-xs font-bold">{m.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-orf-text">
                    {m.name} {m.isCurrentUser && <span className="text-xs text-orf-text-3">(você)</span>}
                  </p>
                  <p className="text-xs text-orf-text-3">{m.email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[m.role] ?? ROLE_COLORS.viewer}`}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
                {isAdmin && !m.isCurrentUser && m.role !== 'owner' && (
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={(e) => updateRole.mutate({ userId: m.userId, role: e.target.value })}
                      className="px-2 py-1 bg-orf-surface-2 border border-orf-border rounded text-xs text-orf-text focus:outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Visualizador</option>
                    </select>
                    <button
                      onClick={() => {
                        if (confirm(`Remover ${m.name} do workspace?`)) removeMember.mutate(m.userId)
                      }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="bg-orf-surface border border-orf-border rounded-orf overflow-hidden">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Convites pendentes</h2>
          </div>
          <div className="divide-y divide-orf-border">
            {pending.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-orf-text">{p.email}</p>
                  <p className="text-xs text-orf-text-3">
                    Expira em {new Date(p.expiresAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[p.role] ?? ROLE_COLORS.viewer}`}>
                  {ROLE_LABELS[p.role] ?? p.role}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-400">Pendente</span>
                {isAdmin && (
                  <button
                    onClick={() => cancelInvite.mutate(p.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
