'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

interface ScheduleEntry {
  id: string
  articleId: string
  scheduledAt: string
  status: 'pending' | 'processing' | 'published' | 'failed' | 'cancelled'
  publishedUrl?: string | null
  article: {
    id: string
    title: string | null
    format: string
    slug: string | null
  }
  integration: {
    id: string
    name: string
    type: string
  }
}

// Normalize DB schedule entry into ScheduledItem for display
interface ScheduledItem {
  id: string
  title: string
  type: string
  status: 'draft' | 'review' | 'scheduled' | 'published'
  platform: string
  time: string
  scheduledAt: Date
}

const TYPE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  blog:     { label: 'Blog Post',  color: 'bg-orf-primary/10 border-orf-primary/30 text-orf-primary', dot: 'bg-orf-primary' },
  listicle: { label: 'Listicle',   color: 'bg-teal-500/10 border-teal-500/30 text-teal-400',         dot: 'bg-teal-400' },
  'how-to': { label: 'How-to',     color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',    dot: 'bg-indigo-400' },
  news:     { label: 'Notícia',    color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',          dot: 'bg-cyan-400' },
  comparison: { label: 'Comparativo', color: 'bg-violet-500/10 border-violet-500/30 text-violet-400', dot: 'bg-violet-400' },
  opinion:  { label: 'Opinião',    color: 'bg-pink-500/10 border-pink-500/30 text-pink-400',          dot: 'bg-pink-400' },
  'product-review': { label: 'Review', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400',  dot: 'bg-amber-400' },
  pillar:   { label: 'Pilar',      color: 'bg-rose-500/10 border-rose-500/30 text-rose-400',         dot: 'bg-rose-400' },
}

const STATUS_MAP: Record<string, 'draft' | 'review' | 'scheduled' | 'published'> = {
  pending: 'scheduled',
  processing: 'scheduled',
  published: 'published',
  failed: 'draft',
  cancelled: 'draft',
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-orf-border text-orf-text-3',
  review:    'orf-badge-primary',
  scheduled: 'orf-badge-warning',
  published: 'orf-badge-success',
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEK_DAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function getWeekDates(): Date[] {
  const today = new Date()
  const monday = new Date(today)
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  monday.setDate(today.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toScheduledItem(entry: ScheduleEntry): ScheduledItem {
  const dt = new Date(entry.scheduledAt)
  return {
    id: entry.id,
    title: entry.article.title ?? 'Artigo sem título',
    type: entry.article.format,
    status: STATUS_MAP[entry.status] ?? 'scheduled',
    platform: entry.integration.name,
    time: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    scheduledAt: dt,
  }
}

export function ScheduleView() {
  const [items, setItems] = useState<ScheduledItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'week' | 'list'>('week')

  const weekDates = getWeekDates()
  const today = new Date()
  const todayIdx = weekDates.findIndex(d => d.toDateString() === today.toDateString())

  useEffect(() => {
    apiRequest<ScheduleEntry[]>('/content/schedules?days=14')
      .then(res => setItems(res.data.map(toScheduledItem)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const itemsByDay = weekDates.map(date =>
    items.filter(item => item.scheduledAt.toDateString() === date.toDateString())
  )

  const stats = [
    { label: 'Próximos 14 dias', value: items.length, icon: '📅' },
    { label: 'Agendados', value: items.filter(i => i.status === 'scheduled').length, icon: '⏰' },
    { label: 'Publicados', value: items.filter(i => i.status === 'published').length, icon: '✅' },
    { label: 'Com erro', value: items.filter(i => i.status === 'draft').length, icon: '⚠️' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-orf-text">Agenda de Conteúdo</h1>
          <p className="text-orf-text-2 mt-1 text-sm">Publicações agendadas via integrações de CMS</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-orf-surface-2 rounded-orf-sm p-0.5 border border-orf-border">
            {(['week', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-[5px] text-xs font-medium transition-all ${
                  view === v ? 'bg-orf-surface text-orf-text shadow-sm' : 'text-orf-text-3 hover:text-orf-text-2'
                }`}
              >
                {v === 'week' ? 'Semana' : 'Lista'}
              </button>
            ))}
          </div>
          <a href="/integrations" className="orf-btn-primary flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Conectar CMS
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="orf-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-orf-text">{loading ? '—' : stat.value}</p>
            <p className="text-xs text-orf-text-3 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="orf-card animate-pulse h-16" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="orf-card flex flex-col items-center justify-center py-16 text-center border-dashed">
          <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-orf-text font-medium">Nenhuma publicação agendada</p>
          <p className="text-orf-text-3 text-sm mt-1 max-w-xs">
            Conecte um CMS nas <a href="/integrations" className="text-orf-primary hover:underline">Integrações</a> e agende artigos pelo detalhe do artigo.
          </p>
        </div>
      ) : view === 'week' ? (
        <WeekView weekDates={weekDates} itemsByDay={itemsByDay} today={today} />
      ) : (
        <ListView items={items} />
      )}

      {/* Legend */}
      {!loading && items.length > 0 && (
        <div className="flex flex-wrap gap-4 pt-2 border-t border-orf-border">
          <p className="text-xs text-orf-text-3 mr-2 self-center">Formatos:</p>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-orf-text-3">{cfg.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WeekView({ weekDates, itemsByDay, today }: { weekDates: Date[]; itemsByDay: ScheduledItem[][]; today: Date }) {
  return (
    <div className="grid grid-cols-7 gap-2 min-h-[420px]">
      {weekDates.map((date, i) => {
        const isToday = date.toDateString() === today.toDateString()
        const isPast = date < today && !isToday
        const items = itemsByDay[i] ?? []
        return (
          <div key={i} className={`flex flex-col rounded-sx border transition-colors min-h-[200px] ${isToday ? 'border-orf-primary/40 bg-orf-primary/5' : 'border-orf-border bg-orf-surface'} ${isPast ? 'opacity-60' : ''}`}>
            <div className={`px-2 py-2 border-b text-center ${isToday ? 'border-orf-primary/20' : 'border-orf-border'}`}>
              <p className="text-xs font-medium text-orf-text-3">{WEEK_DAYS[date.getDay()]}</p>
              <p className={`text-lg font-bold mt-0.5 leading-none ${isToday ? 'text-orf-primary' : isPast ? 'text-orf-text-3' : 'text-orf-text'}`}>
                {date.getDate()}
              </p>
            </div>
            <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
              {items.map(item => {
                const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG['blog']!
                return (
                  <div key={item.id} className={`rounded-[4px] border px-1.5 py-1 cursor-pointer hover:opacity-90 transition-opacity ${cfg.color}`} title={item.title}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className="text-[10px] font-medium opacity-75">{item.time}</span>
                    </div>
                    <p className="text-[10px] leading-tight line-clamp-2 font-medium">{item.title}</p>
                  </div>
                )
              })}
              {items.length === 0 && <p className="text-[10px] text-orf-text-3 text-center mt-4 opacity-50">—</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListView({ items }: { items: ScheduledItem[] }) {
  const sorted = [...items].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
  return (
    <div className="space-y-1">
      {sorted.map(item => {
        const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG['blog']!
        const dateLabel = item.scheduledAt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })
        return (
          <div key={item.id} className="orf-card hover:border-orf-border-2 transition-all duration-200 cursor-pointer group flex items-center gap-4">
            <div className="text-center shrink-0 w-16">
              <p className="text-xs text-orf-text-3 font-medium capitalize">{dateLabel.split(',')[0]}</p>
              <p className="text-orf-text font-bold text-sm">{item.time}</p>
            </div>
            <div className={`w-0.5 self-stretch rounded-full ${cfg.dot}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`orf-badge border ${cfg.color} text-[10px]`}>{cfg.label}</span>
                <span className={`orf-badge ${STATUS_STYLES[item.status]}`}>{item.status}</span>
                {item.platform && <span className="text-xs text-orf-text-3">{item.platform}</span>}
              </div>
              <p className="text-sm font-medium text-orf-text group-hover:text-orf-primary transition-colors truncate">{item.title}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
