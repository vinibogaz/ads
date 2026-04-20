'use client'

export function GeoPromptsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orf-text">Prompts Monitorados</h1>
        <p className="text-orf-text-2 mt-1 text-sm">Gerencie os prompts monitorados nas IAs generativas</p>
      </div>
      <div className="orf-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-orf-text-2 text-sm font-medium">Em desenvolvimento</p>
        <p className="text-orf-text-3 text-xs mt-1">Tabela de prompts com cluster de intenção, visibilidade e sentimento — disponível em breve</p>
      </div>
    </div>
  )
}
