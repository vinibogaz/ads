'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { Workspace } from '@/store/auth'

export function InviteAcceptView({ token }: { token: string }) {
  const router = useRouter()
  const { isAuthenticated, setTokens, setWorkspaces, workspaces } = useAuthStore()
  const [info, setInfo] = useState<{ email: string; role: string; workspaceName: string } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'done' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ email: string; role: string; workspaceName: string }>(`/workspaces/invite-info/${token}`)
      .then((res) => { setInfo(res.data); setStatus('ready') })
      .catch(() => { setError('Convite inválido ou expirado.'); setStatus('error') })
  }, [token])

  const accept = async () => {
    if (!isAuthenticated) {
      // Redirect to login with invite token param
      router.push(`/login?invite=${token}`)
      return
    }
    setStatus('accepting')
    try {
      const res = await api<{ workspaces: Workspace[] }>('/workspaces/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
      setWorkspaces(res.data.workspaces)
      setStatus('done')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao aceitar convite')
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orf-bg">
        <p className="text-orf-text-2 text-sm">Carregando convite...</p>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orf-bg">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-orf-text font-medium">Convite aceito!</p>
          <p className="text-orf-text-2 text-sm">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-orf-bg p-4">
      <div className="bg-orf-surface border border-orf-border rounded-orf w-full max-w-sm p-6 space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-orf-primary/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-orf-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-orf-text">Você foi convidado</h1>
          {info && (
            <p className="text-sm text-orf-text-2 mt-1">
              Para entrar em <strong className="text-orf-text">{info.workspaceName}</strong> como{' '}
              <strong className="text-orf-text">{info.role}</strong>
            </p>
          )}
        </div>

        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-orf-sm p-3 text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        {status === 'ready' && (
          <>
            {!isAuthenticated && (
              <div className="bg-orf-surface-2 rounded-orf-sm p-3 text-xs text-orf-text-2 text-center">
                Você precisará fazer login ou criar uma conta para aceitar o convite.
              </div>
            )}
            <button
              onClick={accept}
              className="w-full px-4 py-2.5 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90"
            >
              {isAuthenticated ? 'Aceitar convite' : 'Fazer login para aceitar'}
            </button>
          </>
        )}

        {status === 'accepting' && (
          <p className="text-center text-sm text-orf-text-2">Aceitando convite...</p>
        )}
      </div>
    </div>
  )
}
