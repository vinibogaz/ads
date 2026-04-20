'use client'

export function GeoCompetitorsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orf-text">Concorrentes</h1>
        <p className="text-orf-text-2 mt-1 text-sm">Monitore concorrentes e compare visibilidade nas IAs</p>
      </div>
      <div className="orf-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-orf-text-2 text-sm font-medium">Em desenvolvimento</p>
        <p className="text-orf-text-3 text-xs mt-1">Lista de concorrentes com menções, posicionamento e sugestões automáticas — disponível em breve</p>
      </div>
    </div>
  )
}
