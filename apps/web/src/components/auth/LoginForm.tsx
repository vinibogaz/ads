'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const { setTokens, setWorkspaces } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Erro ao entrar. Tente novamente.')
        return
      }

      setTokens(data.data.accessToken, data.data.workspaces)
      if (data.data.workspaces) setWorkspaces(data.data.workspaces)

      // Accept invite if coming from invite link
      if (inviteToken) {
        try {
          const acceptRes = await api<{ workspaces: any[] }>('/workspaces/accept-invite', {
            method: 'POST',
            body: JSON.stringify({ token: inviteToken }),
          })
          setWorkspaces(acceptRes.data.workspaces)
        } catch { /* ignore — might already be member */ }
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de conexão. Verifique sua internet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-orf-text-2 mb-1.5">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="orf-input"
          placeholder="seu@email.com"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-orf-text-2">
            Senha
          </label>
        </div>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="orf-input"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="text-orf-error text-sm bg-orf-error/10 border border-orf-error/20 rounded-orf-sm px-3 py-2">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="orf-btn-primary w-full py-2.5">
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Entrando...
          </span>
        ) : (
          'Entrar'
        )}
      </button>
    </form>
  )
}
