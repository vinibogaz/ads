'use client'

import { useState } from 'react'

interface ScheduledItem {
  id: string
  title: string
  type: 'blog' | 'social' | 'email' | 'video' | 'listicle'
  status: 'draft' | 'review' | 'scheduled' | 'published'
  platform?: string
  time?: string
  dayOffset: number // 0=today, 1=tomorrow, etc.
}

const TYPE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  blog:     { label: 'Blog Post',  color: 'bg-orf-primary/10 border-orf-primary/30 text-orf-primary', dot: 'bg-orf-primary' },
  social:   { label: 'Social',     color: 'bg-purple-500/10 border-purple-500/30 text-purple-400',  dot: 'bg-purple-400' },
  email:    { label: 'E-mail',     color: 'bg-amber-500/10 border-amber-500/30 text-amber-400',     dot: 'bg-amber-400' },
  video:    { label: 'Vídeo',      color: 'bg-rose-500/10 border-rose-500/30 text-rose-400',         dot: 'bg-rose-400' },
  listicle: { label: 'Listicle',   color: 'bg-teal-500/10 border-teal-500/30 text-teal-400',         dot: 'bg-teal-400' },
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-orf-border text-orf-text-3',
  review:    'orf-badge-primary',
  scheduled: 'orf-badge-warning',
  published: 'orf-badge-success',
}

// Mock data — in production this comes from /content/articles?scheduled=true
const MOCK_ITEMS: ScheduledItem[] = [
  { id: '1', title: 'Como usar IA para SEO em 2025', type: 'blog',     status: 'scheduled', platform: 'WordPress', time: '09:00', dayOffset: 0 },
  { id: '2', title: '5 ferramentas de GEO que você precisa conhecer', type: 'listicle', status: 'review', platform: 'Medium', time: '11:00', dayOffset: 0 },
  { id: '3', title: 'Thread: GEO vs SEO — diferenças chave', type: 'social', status: 'scheduled', platform: 'LinkedIn', time: '14:30', dayOffset: 1 },
  { id: '4', title: 'Newsletter: Tendências de IA para marketing', type: 'email', status: 'draft', platform: 'Mailchimp', time: '08:00', dayOffset: 1 },
  { id: '5', title: 'Guia definitivo: Marketing de conteúdo com IA', type: 'blog', status: 'published', platform: 'WordPress', time: '10:00', dayOffset: 2 },
  { id: '6', title: 'Shorts: O que é GEO Monitor?', type: 'video', status: 'scheduled', platform: 'YouTube', time: '16:00', dayOffset: 2 },
  { id: '7', title: 'Comparativo: ChatGPT vs Gemini para conteúdo', type: 'blog', status: 'scheduled', platform: 'WordPress', time: '09:30', dayOffset: 3 },
  { id: '8', title: 'Post: Cases de sucesso com ORFFIA', type: 'social', status: 'draft', platform: 'Instagram', time: '12:00', dayOffset: 4 },
  { id: '9', title: 'Webinar recap: SEO em 2025', type: 'blog', status: 'scheduled', platform: 'WordPress', time: '15:00', dayOffset: 5 },
  { id: '10', title: 'E-mail: Dicas semanais de SEO', type: 'email', status: 'scheduled', platform: 'Mailchimp', time: '09:00', dayOffset: 6 },
]

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEK_DAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function getWeekDates(): Date[] {
  const today = new Date()
  const monday = new Date(today)
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day // adjust for Monday start
  monday.setDate(today.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function ScheduleView() {
  const [view, setView] = useState<'week' | 'list'>('week')
  const weekDates = getWeekDates()
  const today = new Date()

  // Map dayOffset to actual dates: offset 0 = today
  const todayIdx = weekDates.findIndex(
    d => d.toDateString() === today.toDateString()
  )

  const itemsByDay = weekDates.map((_, i) => {
    const offset = i - (todayIdx === -1 ? 0 : todayIdx)
    return MOCK_ITEMS.filter(item => item.dayOffset === offset)
  })

  const stats = [
    { label: 'Esta semana', value: MOCK_ITEMS.length, icon: '📅' },
    { label: 'Agendados', value: MOCK_ITEMS.filter(i => i.status === 'scheduled').length, icon: '⏰' },
    { label: 'Publicados', value: MOCK_ITEMS.filter(i => i.status === 'published').length, icon: '✅' },
    { label: 'Em revisão', value: MOCK_ITEMS.filter(i => i.status === 'review').length, icon: '👁' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-orf-text">Agenda de Conteúdo</h1>
          <p className="text-orf-text-2 mt-1 text-sm">Planejamento e publicações da semana</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-orf-surface-2 rounded-orf-sm p-0.5 border border-orf-border">
            {(['week', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-[5px] text-xs font-medium transition-all ${
                  view === v
                    ? 'bg-orf-surface text-orf-text shadow-sm'
                    : 'text-orf-text-3 hover:text-orf-text-2'
                }`}
              >
                {v === 'week' ? 'Semana' : 'Lista'}
              </button>
            ))}
          </div>
          <button className="orf-btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agendar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="orf-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-orf-text">{stat.value}</p>
            <p className="text-xs text-orf-text-3 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {view === 'week' ? (
        <WeekView weekDates={weekDates} itemsByDay={itemsByDay} today={today} />
      ) : (
        <ListView items={MOCK_ITEMS} weekDates={weekDates} todayIdx={todayIdx} />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2 border-t border-orf-border">
        <p className="text-xs text-orf-text-3 mr-2 self-center">Tipos:</p>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="text-xs text-orf-text-3">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeekView({
  weekDates,
  itemsByDay,
  today,
}: {
  weekDates: Date[]
  itemsByDay: ScheduledItem[][]
  today: Date
}) {
  return (
    <div className="grid grid-cols-7 gap-2 min-h-[420px]">
      {weekDates.map((date, i) => {
        const isToday = date.toDateString() === today.toDateString()
        const isPast = date < today && !isToday
        const items = itemsByDay[i] ?? []

        return (
          <div
            key={i}
            className={`flex flex-col rounded-sx border transition-colors min-h-[200px] ${
              isToday
                ? 'border-orf-primary/40 bg-orf-primary/5'
                : 'border-orf-border bg-orf-surface'
            } ${isPast ? 'opacity-60' : ''}`}
          >
            {/* Day header */}
            <div
              className={`px-2 py-2 border-b text-center ${
                isToday ? 'border-orf-primary/20' : 'border-orf-border'
              }`}
            >
              <p className="text-xs font-medium text-orf-text-3">{WEEK_DAYS[date.getDay()]}</p>
              <p
                className={`text-lg font-bold mt-0.5 leading-none ${
                  isToday
                    ? 'text-orf-primary'
                    : isPast
                    ? 'text-orf-text-3'
                    : 'text-orf-text'
                }`}
              >
                {date.getDate()}
              </p>
            </div>

            {/* Items */}
            <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
              {items.map(item => {
                const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG['blog']!
                return (
                  <div
                    key={item.id}
                    className={`rounded-[4px] border px-1.5 py-1 cursor-pointer hover:opacity-90 transition-opacity ${cfg.color}`}
                    title={item.title}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className="text-[10px] font-medium opacity-75">{item.time}</span>
                    </div>
                    <p className="text-[10px] leading-tight line-clamp-2 font-medium">{item.title}</p>
                  </div>
                )
              })}
              {items.length === 0 && (
                <p className="text-[10px] text-orf-text-3 text-center mt-4 opacity-50">—</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListView({
  items,
  weekDates,
  todayIdx,
}: {
  items: ScheduledItem[]
  weekDates: Date[]
  todayIdx: number
}) {
  const sorted = [...items].sort((a, b) => {
    if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset
    return (a.time ?? '').localeCompare(b.time ?? '')
  })

  return (
    <div className="space-y-1">
      {sorted.map(item => {
        const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG['blog']!
        const dateIdx = todayIdx + item.dayOffset
        const date = weekDates[dateIdx]
        const dateLabel = date
          ? `${WEEK_DAYS_LONG[date.getDay()]}, ${date.getDate()}`
          : item.dayOffset === 0
          ? 'Hoje'
          : item.dayOffset === 1
          ? 'Amanhã'
          : `+${item.dayOffset} dias`

        return (
          <div
            key={item.id}
            className="orf-card hover:border-orf-border-2 transition-all duration-200 cursor-pointer group flex items-center gap-4"
          >
            <div className="text-center shrink-0 w-14">
              <p className="text-xs text-orf-text-3 font-medium">{dateLabel.split(',')[0]}</p>
              <p className="text-orf-text font-bold text-sm">{item.time ?? '—'}</p>
            </div>

            <div className={`w-0.5 self-stretch rounded-full ${cfg.dot}`} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`orf-badge border ${cfg.color} text-[10px]`}>{cfg.label}</span>
                <span className={`orf-badge ${STATUS_STYLES[item.status]}`}>{item.status}</span>
                {item.platform && (
                  <span className="text-xs text-orf-text-3">{item.platform}</span>
                )}
              </div>
              <p className="text-sm font-medium text-orf-text group-hover:text-orf-primary transition-colors truncate">
                {item.title}
              </p>
            </div>

            <button className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-orf-text-3 hover:text-orf-primary p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
