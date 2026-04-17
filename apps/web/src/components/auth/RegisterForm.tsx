'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

export function RegisterForm() {
  const [form, setForm] = useState({ email: '', password: '', name: '', tenantName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.message ?? 'Erro ao criar conta.'
        setError(msg)
        return
      }

      setTokens(data.data.accessToken)
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
      <div>
        <label className="block text-sm font-medium text-sx-text-2 mb-1.5">Nome completo</label>
        <input
          type="text"
          value={form.name}
          onChange={set('name')}
          className="sx-input"
          placeholder="Seu nome"
          required
          minLength={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-sx-text-2 mb-1.5">E-mail</label>
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          className="sx-input"
          placeholder="seu@email.com"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-sx-text-2 mb-1.5">Nome da empresa / workspace</label>
        <input
          type="text"
          value={form.tenantName}
          onChange={set('tenantName')}
          className="sx-input"
          placeholder="Minha Empresa"
          required
          minLength={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-sx-text-2 mb-1.5">Senha</label>
        <input
          type="password"
          value={form.password}
          onChange={set('password')}
          className="sx-input"
          placeholder="Mínimo 8 caracteres"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="text-sx-error text-sm bg-sx-error/10 border border-sx-error/20 rounded-sx-sm px-3 py-2">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="sx-btn-primary w-full py-2.5">
        {loading ? 'Criando conta...' : 'Criar conta grátis'}
      </button>
    </form>
  )
}
