'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { Lead, LeadStatus } from '@ads/shared'

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
  new: 'bg-blue-100 text-blue-700',
  no_contact: 'bg-gray-100 text-gray-600',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  unqualified: 'bg-red-100 text-red-600',
  opportunity: 'bg-purple-100 text-purple-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
}

export function LeadsView() {
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['leads', statusFilter],
    queryFn: () =>
      api<Lead[]>(`/leads${statusFilter ? `?status=${statusFilter}` : ''}`),
  })

  const leads: Lead[] = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Leads</h1>
          <p className="text-sm text-orf-text-2 mt-0.5">Repositório de leads integrado ao seu CRM</p>
        </div>
        <button className="px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 transition-colors">
          + Novo Lead
        </button>
      </div>

      {/* Filters */}
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-orf-border bg-orf-surface-2">
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Nome</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Email</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Origem</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Conv. Offline</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orf-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-orf-text-2">Carregando...</td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-orf-text-2">Nenhum lead encontrado.</td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-orf-surface-2 transition-colors cursor-pointer">
                  <td className="px-5 py-3 font-medium text-orf-text">{lead.name ?? '—'}</td>
                  <td className="px-5 py-3 text-orf-text-2">{lead.email ?? '—'}</td>
                  <td className="px-5 py-3 text-orf-text-2">
                    {lead.utmSource ? (
                      <span className="text-xs">
                        {lead.utmSource}
                        {lead.utmCampaign ? ` / ${lead.utmCampaign}` : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {lead.conversionSentAt ? (
                      <span className="text-xs text-emerald-600 font-medium">Enviado</span>
                    ) : (
                      <span className="text-xs text-orf-text-3">Pendente</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-orf-text-2 text-xs">
                    {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
