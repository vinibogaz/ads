import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orf-text">Dashboard</h1>
        <p className="text-orf-text-2 mt-1">Bem-vindo à plataforma ORFFIA</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="orf-card">
          <p className="text-orf-text-2 text-sm font-medium">Artigos gerados</p>
          <p className="text-3xl font-bold text-orf-text mt-2">0</p>
          <p className="text-xs text-orf-text-3 mt-1">Este mês</p>
        </div>

        <div className="orf-card">
          <p className="text-orf-text-2 text-sm font-medium">GEO Score</p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-3xl font-bold text-orf-text">—</p>
          </div>
          <p className="text-xs text-orf-text-3 mt-1">Configure um monitor</p>
        </div>

        <div className="orf-card">
          <p className="text-orf-text-2 text-sm font-medium">Agendamentos</p>
          <p className="text-3xl font-bold text-orf-text mt-2">0</p>
          <p className="text-xs text-orf-text-3 mt-1">Esta semana</p>
        </div>
      </div>

      {/* Activity */}
      <div className="orf-card">
        <h2 className="text-sm font-semibold text-orf-text mb-4">Atividade Recente</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-orf-surface-2 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-orf-text-2 text-sm">Nenhuma atividade ainda</p>
          <p className="text-orf-text-3 text-xs mt-1">Comece gerando seu primeiro conteúdo</p>
        </div>
      </div>
    </div>
  )
}
