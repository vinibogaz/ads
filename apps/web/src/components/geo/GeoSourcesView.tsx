'use client'

export function GeoSourcesView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orf-text">Fontes Citadas</h1>
        <p className="text-orf-text-2 mt-1 text-sm">Domínios citados pelas IAs ao responder prompts monitorados</p>
      </div>
      <div className="orf-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <p className="text-orf-text-2 text-sm font-medium">Em desenvolvimento</p>
        <p className="text-orf-text-3 text-xs mt-1">Tabela de domínios com favicon, páginas, prompts, modelos e impacto% — disponível em breve</p>
      </div>
    </div>
  )
}
