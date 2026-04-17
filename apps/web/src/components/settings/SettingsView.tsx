'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { apiRequest } from '@/lib/api'

export function SettingsView() {
  const { user } = useAuthStore()

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)

    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('As senhas não coincidem')
      return
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('Nova senha deve ter pelo menos 8 caracteres')
      return
    }

    setPwLoading(true)
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      })
      setPwSuccess(true)
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Erro ao trocar senha')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-sx-text">Configurações</h1>
        <p className="text-sx-text-2 mt-1 text-sm">Gerencie sua conta e preferências</p>
      </div>

      {/* Profile */}
      <div className="sx-card space-y-4">
        <h2 className="text-sm font-semibold text-sx-text">Perfil</h2>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-sx-primary/20 border border-sx-primary/30 flex items-center justify-center">
            <span className="text-lg font-semibold text-sx-primary">
              {user?.name
                ? user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
                : '?'}
            </span>
          </div>
          <div>
            <p className="font-medium text-sx-text">{user?.name ?? '—'}</p>
            <p className="text-sm text-sx-text-2">{user?.email ?? '—'}</p>
            <span className="sx-badge sx-badge-primary mt-1">{user?.role ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="sx-card space-y-4">
        <h2 className="text-sm font-semibold text-sx-text">Trocar Senha</h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-sx-text-2 mb-1.5">Senha atual</label>
            <input
              type="password"
              className="sx-input"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sx-text-2 mb-1.5">Nova senha</label>
            <input
              type="password"
              className="sx-input"
              placeholder="Mínimo 8 caracteres"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sx-text-2 mb-1.5">Confirmar nova senha</label>
            <input
              type="password"
              className="sx-input"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              required
              autoComplete="new-password"
            />
          </div>

          {pwError && (
            <div className="text-sx-error text-sm bg-sx-error/10 border border-sx-error/20 rounded-sx-sm px-3 py-2">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="text-sx-success text-sm bg-sx-success/10 border border-sx-success/20 rounded-sx-sm px-3 py-2">
              Senha alterada com sucesso. Você foi deslogado de outros dispositivos.
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={pwLoading} className="sx-btn-primary">
              {pwLoading ? 'Salvando...' : 'Trocar senha'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="sx-card border-sx-error/20 space-y-3">
        <h2 className="text-sm font-semibold text-sx-error">Zona de Perigo</h2>
        <p className="text-sm text-sx-text-2">
          Ações irreversíveis que afetam sua conta.
        </p>
        <button
          onClick={() => useAuthStore.getState().logout()}
          className="sx-btn-secondary text-sx-error border-sx-error/30 hover:border-sx-error/60"
        >
          Sair de todos os dispositivos
        </button>
      </div>
    </div>
  )
}
