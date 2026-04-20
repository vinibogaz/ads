'use client'

export function GeoPagesView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orf-text">Páginas Monitoradas</h1>
        <p className="text-orf-text-2 mt-1 text-sm">URLs do seu site monitoradas nas respostas das IAs</p>
      </div>
      <div className="orf-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-orf-text-2 text-sm font-medium">Em desenvolvimento</p>
        <p className="text-orf-text-3 text-xs mt-1">Lista de URLs com citações, data de adição e botão para adicionar/remover — disponível em breve</p>
      </div>
    </div>
  )
}
