'use client'

import { useAuthStore } from '@/store/auth'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { user, logout } = useAuthStore()

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?'

  return (
    <header className="h-14 border-b border-orf-border bg-orf-surface/50 backdrop-blur-sm px-6 flex items-center justify-between shrink-0">
      {title && <h1 className="text-sm font-semibold text-orf-text">{title}</h1>}
      {!title && <div />}

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-orf-primary/20 border border-orf-primary/30 flex items-center justify-center">
              <span className="text-xs font-semibold text-orf-primary">{initials}</span>
            </div>
            <span className="text-sm text-orf-text-2 hidden sm:block">
              {user.name ?? user.email ?? 'Usuário'}
            </span>
          </div>
        )}

        <button
          onClick={logout}
          className="orf-btn-ghost px-2 py-1.5 text-xs"
          title="Sair"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
