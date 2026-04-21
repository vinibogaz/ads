'use client'

import { useState, useEffect } from 'react'
import { apiRequest } from '@/lib/api'

interface Monitor {
  id: string
  brandName: string
}

interface GeoAlert {
  id: string
  monitorId: string
  type: 'score_drop' | 'mention_lost' | 'competitor_surpassed' | 'new_citation'
  threshold: string | null
  isActive: boolean
  lastTriggeredAt: string | null
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  score_drop: 'Queda de Score',
  mention_lost: 'Perda de Menção',
  competitor_surpassed: 'Concorrente Ultrapassou',
  new_citation: 'Nova Citação',
}

const TYPE_NEEDS_THRESHOLD: Record<string, boolean> = {
  score_drop: true,
  mention_lost: false,
  competitor_surpassed: false,
  new_citation: false,
}

export function GeoAlertsView() {
  const [alerts, setAlerts] = useState<GeoAlert[]>([])
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    monitorId: '',
    type: 'score_drop' as GeoAlert['type'],
    threshold: '20',
  })

  useEffect(() => {
    Promise.all([
      apiRequest<GeoAlert[]>('/geo/alerts'),
      apiRequest<Monitor[]>('/geo/monitors'),
    ]).then(([a, m]) => {
      setAlerts(a.data ?? [])
      setMonitors(m.data ?? [])
      if (m.data?.[0]) setForm(f => ({ ...f, monitorId: m.data[0].id }))
    }).finally(() => setLoading(false))
  }, [])

  async function createAlert() {
    if (!form.monitorId) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        monitorId: form.monitorId,
        type: form.type,
      }
      if (TYPE_NEEDS_THRESHOLD[form.type]) {
        payload.threshold = parseFloat(form.threshold)
      }
      const { data } = await apiRequest<GeoAlert>('/geo/alerts', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setAlerts(prev => [data, ...prev])
      setShowForm(false)
    } catch {
      // ignore — user can retry
    } finally {
      setSaving(false)
    }
  }

  async function deleteAlert(id: string) {
    await apiRequest(`/geo/alerts/${id}`, { method: 'DELETE' })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  async function toggleAlert(id: string) {
    const { data } = await apiRequest<GeoAlert>(`/geo/alerts/${id}/toggle`, { method: 'PATCH' })
    setAlerts(prev => prev.map(a => a.id === id ? data : a))
  }

  const monitorName = (id: string) => monitors.find(m => m.id === id)?.brandName ?? id.slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orf-text">Alertas GEO</h1>
          <p className="text-orf-text-2 mt-1 text-sm">
            Receba notificações automáticas sobre mudanças na sua presença em IAs
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="orf-btn-primary px-4 py-2 text-sm"
        >
          + Novo Alerta
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="orf-card space-y-4">
          <p className="text-sm font-semibold text-orf-text">Configurar alerta</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-orf-text-3 block mb-1">Monitor</label>
              <select
                value={form.monitorId}
                onChange={e => setForm(f => ({ ...f, monitorId: e.target.value }))}
                className="w-full bg-orf-surface-2 border border-orf-border rounded-lg px-3 py-2 text-sm text-orf-text focus:outline-none focus:border-orf-accent"
              >
                {monitors.map(m => (
                  <option key={m.id} value={m.id}>{m.brandName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-orf-text-3 block mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as GeoAlert['type'] }))}
                className="w-full bg-orf-surface-2 border border-orf-border rounded-lg px-3 py-2 text-sm text-orf-text focus:outline-none focus:border-orf-accent"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {TYPE_NEEDS_THRESHOLD[form.type] && (
              <div>
                <label className="text-xs text-orf-text-3 block mb-1">Threshold (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.threshold}
                  onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
                  className="w-full bg-orf-surface-2 border border-orf-border rounded-lg px-3 py-2 text-sm text-orf-text focus:outline-none focus:border-orf-accent"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm rounded-lg text-orf-text-2 hover:text-orf-text hover:bg-orf-surface-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={createAlert}
              disabled={saving || !form.monitorId}
              className="orf-btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar Alerta'}
            </button>
          </div>
        </div>
      )}

      {/* Alerts list */}
      {loading ? (
        <div className="orf-card py-12 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-orf-accent border-t-transparent animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="orf-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-orf-text-2 text-sm font-medium">Nenhum alerta configurado</p>
          <p className="text-orf-text-3 text-xs mt-1">Crie um alerta para ser notificado sobre mudanças importantes</p>
        </div>
      ) : (
        <div className="orf-card divide-y divide-orf-border">
          {alerts.map(alert => (
            <div key={alert.id} className="flex items-center justify-between py-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${alert.isActive ? 'bg-orf-success' : 'bg-orf-text-3'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-orf-text">
                    {TYPE_LABELS[alert.type] ?? alert.type}
                    {alert.threshold ? ` — ${alert.threshold}%` : ''}
                  </p>
                  <p className="text-xs text-orf-text-3">
                    {monitorName(alert.monitorId)}
                    {alert.lastTriggeredAt
                      ? ` · Último disparo: ${new Date(alert.lastTriggeredAt).toLocaleDateString('pt-BR')}`
                      : ' · Nunca disparado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    alert.isActive
                      ? 'border-orf-success text-orf-success hover:bg-orf-success/10'
                      : 'border-orf-border text-orf-text-3 hover:border-orf-text-2'
                  }`}
                >
                  {alert.isActive ? 'Ativo' : 'Inativo'}
                </button>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="text-orf-text-3 hover:text-orf-error transition-colors p-1"
                  aria-label="Remover alerta"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
