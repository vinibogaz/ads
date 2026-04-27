'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { Lead, LeadStatus } from '@ads/shared'
import { useClientStore } from '@/store/client'

const PLATFORM_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  facebook:  { label: 'Facebook',  color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  instagram: { label: 'Instagram', color: 'text-pink-400',   bg: 'bg-pink-500/10' },
  google:    { label: 'Google',    color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  youtube:   { label: 'YouTube',   color: 'text-red-400',    bg: 'bg-red-500/10' },
  linkedin:  { label: 'LinkedIn',  color: 'text-blue-500',   bg: 'bg-blue-600/10' },
  tiktok:    { label: 'TikTok',    color: 'text-orf-text',   bg: 'bg-orf-surface-2' },
  twitter:   { label: 'Twitter/X', color: 'text-sky-400',    bg: 'bg-sky-500/10' },
  organic:   { label: 'Orgânico',  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  direct:    { label: 'Direto',    color: 'text-orf-text-2', bg: 'bg-orf-surface-2' },
  email:     { label: 'E-mail',    color: 'text-purple-400', bg: 'bg-purple-500/10' },
  referral:  { label: 'Referral',  color: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  whatsapp:  { label: 'WhatsApp',  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
}

function SourceBadge({ source, medium, campaign }: { source?: string | null; medium?: string | null; campaign?: string | null }) {
  if (!source) return <span className="text-orf-text-3 text-xs">—</span>
  const cfg = PLATFORM_CONFIG[source.toLowerCase()] ?? { label: source, color: 'text-orf-text-2', bg: 'bg-orf-surface-2' }
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
      </span>
      {medium && medium !== '(none)' && <span className="text-xs text-orf-text-3">{medium}</span>}
      {campaign && <span className="text-xs text-orf-text-3 truncate max-w-[120px]">{campaign}</span>}
    </div>
  )
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  no_contact: 'Sem Contato',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  unqualified: 'Desqualificado',
  opportunity: 'Oportunidade',
  won: 'Ganho',
  lost: 'Perdido',
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  no_contact: 'bg-gray-500/10 text-gray-400',
  contacted: 'bg-yellow-500/10 text-yellow-400',
  qualified: 'bg-green-500/10 text-green-400',
  unqualified: 'bg-red-500/10 text-red-400',
  opportunity: 'bg-purple-500/10 text-purple-400',
  won: 'bg-emerald-500/10 text-emerald-400',
  lost: 'bg-red-500/10 text-red-500',
}

type LeadWithRevenue = Lead & {
  value?: string | null
  mrr?: string | null
  implantation?: string | null
  closedAt?: string | null
}

type EditForm = {
  status: LeadStatus
  name: string
  email: string
  phone: string
  company: string
  value: string
  mrr: string
  implantation: string
  closedAt: string
}

const fmt = (v: string | null | undefined) =>
  v ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-orf-surface border border-orf-border rounded-orf w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-orf-border sticky top-0 bg-orf-surface z-10">
          <h2 className="text-sm font-semibold text-orf-text">{title}</h2>
          <button onClick={onClose} className="text-orf-text-2 hover:text-orf-text">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary'

export function LeadsView() {
  const queryClient = useQueryClient()
  const { selectedClientId } = useClientStore()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [editLead, setEditLead] = useState<LeadWithRevenue | null>(null)
  const [form, setForm] = useState<EditForm>({ status: 'new', name: '', email: '', phone: '', company: '', value: '', mrr: '', implantation: '', closedAt: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['leads', statusFilter, selectedClientId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (selectedClientId) params.set('clientId', selectedClientId)
      return api<LeadWithRevenue[]>(`/leads?${params}`)
    },
  })

  const leads: LeadWithRevenue[] = data?.data ?? []

  const openEdit = (lead: LeadWithRevenue) => {
    setEditLead(lead)
    setForm({
      status: lead.status,
      name: lead.name ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      company: lead.company ?? '',
      value: lead.value ? String(parseFloat(lead.value)) : '',
      mrr: lead.mrr ? String(parseFloat(lead.mrr)) : '',
      implantation: lead.implantation ? String(parseFloat(lead.implantation)) : '',
      closedAt: lead.closedAt ? (lead.closedAt.split('T')[0] ?? '') : '',
    })
  }

  const update = useMutation({
    mutationFn: async () => {
      if (!editLead) return
      const payload: Record<string, unknown> = {
        status: form.status,
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        company: form.company || undefined,
        value: form.value ? parseFloat(form.value) : undefined,
        mrr: form.mrr ? parseFloat(form.mrr) : undefined,
        implantation: form.implantation ? parseFloat(form.implantation) : undefined,
        closedAt: form.closedAt ? new Date(form.closedAt + 'T12:00:00Z').toISOString() : undefined,
      }
      return api(`/leads/${editLead.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead-metrics'] })
      setEditLead(null)
    },
  })

  const set = (k: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Leads</h1>
          <p className="text-sm text-orf-text-2 mt-0.5">Repositório de leads integrado ao seu CRM</p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {(['', ...Object.keys(STATUS_LABELS)] as string[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-orf-primary text-white'
                : 'bg-orf-surface border border-orf-border text-orf-text-2 hover:text-orf-text'
            }`}
          >
            {s === '' ? 'Todos' : STATUS_LABELS[s as LeadStatus]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-orf-surface rounded-orf border border-orf-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orf-border bg-orf-surface-2">
                <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Origem</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Valor</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">MRR</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Fechamento</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Entrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orf-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-orf-text-2">Carregando...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-orf-text-2">Nenhum lead encontrado.</td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-orf-surface-2 transition-colors cursor-pointer"
                    onClick={() => openEdit(lead)}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-orf-text">{lead.name ?? '—'}</p>
                      {lead.email && <p className="text-xs text-orf-text-3">{lead.email}</p>}
                      {lead.company && <p className="text-xs text-orf-text-3">{lead.company}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <SourceBadge source={lead.utmSource} medium={(lead as any).utmMedium} campaign={lead.utmCampaign} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium">
                      {fmt(lead.value) ? (
                        <span className="text-emerald-400">{fmt(lead.value)}</span>
                      ) : <span className="text-orf-text-3">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {fmt(lead.mrr) ? (
                        <span className="text-orf-text-2">{fmt(lead.mrr)}</span>
                      ) : <span className="text-orf-text-3">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-orf-text-2">
                      {lead.closedAt ? new Date(lead.closedAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-orf-text-2">
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editLead && (
        <Modal title={`Editar Lead: ${editLead.name ?? editLead.email ?? 'Lead'}`} onClose={() => setEditLead(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Nome</label>
                <input type="text" value={form.name} onChange={set('name')} className={inputCls} placeholder="Nome do lead" />
              </div>
              <div>
                <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Status</label>
                <select value={form.status} onChange={set('status')} className={inputCls}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Telefone</label>
                <input type="text" value={form.phone} onChange={set('phone')} className={inputCls} placeholder="(11) 99999-9999" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Empresa</label>
              <input type="text" value={form.company} onChange={set('company')} className={inputCls} placeholder="Nome da empresa" />
            </div>

            <div className="border-t border-orf-border pt-4">
              <p className="text-xs font-semibold text-orf-text-2 uppercase tracking-wide mb-3">Receita</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Valor da Venda (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.value} onChange={set('value')} className={inputCls} placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-orf-text-2 mb-1.5">MRR (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.mrr} onChange={set('mrr')} className={inputCls} placeholder="0,00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Implantação (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.implantation} onChange={set('implantation')} className={inputCls} placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Data de Fechamento</label>
                  <input type="date" value={form.closedAt} onChange={set('closedAt')} className={inputCls} />
                </div>
              </div>
            </div>

            {/* UTM info (read-only) */}
            {(editLead.utmSource || editLead.gclid || editLead.fbclid) && (
              <div className="border-t border-orf-border pt-4">
                <p className="text-xs font-semibold text-orf-text-2 uppercase tracking-wide mb-3">UTMs</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {editLead.utmSource && <><span className="text-orf-text-3">Source:</span><span className="text-orf-text">{editLead.utmSource}</span></>}
                  {editLead.utmMedium && <><span className="text-orf-text-3">Medium:</span><span className="text-orf-text">{editLead.utmMedium}</span></>}
                  {editLead.utmCampaign && <><span className="text-orf-text-3">Campaign:</span><span className="text-orf-text">{editLead.utmCampaign}</span></>}
                  {editLead.gclid && <><span className="text-orf-text-3">GCLID:</span><span className="text-orf-text truncate">{editLead.gclid}</span></>}
                  {editLead.fbclid && <><span className="text-orf-text-3">FBCLID:</span><span className="text-orf-text truncate">{editLead.fbclid}</span></>}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditLead(null)} className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text">Cancelar</button>
              <button
                onClick={() => update.mutate()}
                disabled={update.isPending}
                className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50"
              >
                {update.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
