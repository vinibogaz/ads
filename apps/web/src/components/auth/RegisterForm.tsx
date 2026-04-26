'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'

export function RegisterForm() {
  const [form, setForm] = useState({ email: '', password: '', name: '', tenantName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const { setTokens, setWorkspaces } = useAuthStore()

  // When coming from an invite, pre-fill email and hide tenant name field
  const fromInvite = !!inviteToken

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = fromInvite
        ? { ...form, tenantName: form.tenantName || form.name || 'Minha Conta' }
        : form

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Erro ao criar conta.')
        return
      }

      setTokens(data.data.accessToken, data.data.workspaces)
      if (data.data.workspaces) setWorkspaces(data.data.workspaces)

      // Accept pending invite after registration
      if (inviteToken) {
        try {
          const acceptRes = await api<{ workspaces: any[] }>('/workspaces/accept-invite', {
            method: 'POST',
            body: JSON.stringify({ token: inviteToken }),
          })
          setWorkspaces(acceptRes.data.workspaces)
        } catch { /* already member or expired */ }
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fromInvite && (
        <div className="bg-orf-primary/10 border border-orf-primary/20 rounded-orf-sm px-3 py-2 text-xs text-orf-primary">
          Crie sua conta para aceitar o convite.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-orf-text-2 mb-1.5">Nome completo</label>
        <input type="text" value={form.name} onChange={set('name')}
          className="orf-input" placeholder="Seu nome" required minLength={2} />
      </div>

      <div>
        <label className="block text-sm font-medium text-orf-text-2 mb-1.5">E-mail</label>
        <input type="email" value={form.email} onChange={set('email')}
          className="orf-input" placeholder="seu@email.com" required autoComplete="email" />
      </div>

      {!fromInvite && (
        <div>
          <label className="block text-sm font-medium text-orf-text-2 mb-1.5">Nome da empresa / workspace</label>
          <input type="text" value={form.tenantName} onChange={set('tenantName')}
            className="orf-input" placeholder="Minha Empresa" required minLength={2} />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-orf-text-2 mb-1.5">Senha</label>
        <input type="password" value={form.password} onChange={set('password')}
          className="orf-input" placeholder="Mínimo 8 caracteres" required minLength={8} autoComplete="new-password" />
      </div>

      {error && (
        <div className="text-orf-error text-sm bg-orf-error/10 border border-orf-error/20 rounded-orf-sm px-3 py-2">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="orf-btn-primary w-full py-2.5">
        {loading ? 'Criando conta...' : fromInvite ? 'Criar conta e aceitar convite' : 'Criar conta grátis'}
      </button>
    </form>
  )
}
