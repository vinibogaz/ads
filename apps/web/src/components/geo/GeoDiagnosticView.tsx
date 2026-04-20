'use client'

export function GeoDiagnosticView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orf-text">Diagnóstico GEO</h1>
        <p className="text-orf-text-2 mt-1 text-sm">Avaliação técnica do seu site para otimização em IAs generativas</p>
      </div>
      <div className="orf-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>
        <p className="text-orf-text-2 text-sm font-medium">Em desenvolvimento</p>
        <p className="text-orf-text-3 text-xs mt-1">GEO Readiness Score, findings de JSON-LD, robots.txt, meta tags, E-E-A-T — disponível em breve</p>
      </div>
    </div>
  )
}
