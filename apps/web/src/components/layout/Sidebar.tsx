'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const geoSubItems = [
  { label: 'Dashboard', href: '/geo' },
  { label: 'Prompts Monitorados', href: '/geo/prompts' },
  { label: 'Concorrentes', href: '/geo/competitors' },
  { label: 'Plano de Ação', href: '/geo/action-plans' },
  { label: 'Fontes Citadas', href: '/geo/sources' },
  { label: 'Páginas Monit.', href: '/geo/pages' },
  { label: 'Diagnóstico GEO', href: '/geo/diagnostic' },
  { label: 'AI Traffic', href: '/geo/traffic' },
  { label: 'Alertas', href: '/geo/alerts' },
]

const topNavItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Content Engine',
    href: '/content',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
]

const bottomNavItems = [
  {
    label: 'Agenda',
    href: '/schedule',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Integrações',
    href: '/integrations',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    label: 'Configurações',
    href: '/settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const isGeoSection = pathname === '/geo' || pathname.startsWith('/geo/')
  const [geoOpen, setGeoOpen] = useState(isGeoSection)

  useEffect(() => {
    if (isGeoSection) setGeoOpen(true)
  }, [isGeoSection])

  return (
    <aside className="w-56 bg-orf-surface border-r border-orf-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-orf-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-orf-sm bg-orf-primary flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-bold text-orf-text text-sm">Orffia Ads</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {/* Top items */}
        {topNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-orf-sm text-sm transition-colors ${
                isActive
                  ? 'bg-orf-primary/10 text-orf-primary font-medium'
                  : 'text-orf-text-2 hover:text-orf-text hover:bg-orf-surface-2'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}

        {/* GEO Monitor section */}
        <div className="pt-1">
          <button
            onClick={() => setGeoOpen((o) => !o)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-orf-sm text-sm transition-colors ${
              isGeoSection
                ? 'bg-orf-primary/10 text-orf-primary font-medium'
                : 'text-orf-text-2 hover:text-orf-text hover:bg-orf-surface-2'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="flex-1 text-left">GEO Monitor</span>
            <svg
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${geoOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {geoOpen && (
            <div className="mt-0.5 ml-3 pl-3 border-l border-orf-border space-y-0.5">
              {geoSubItems.map((item) => {
                const isActive =
                  item.href === '/geo'
                    ? pathname === '/geo'
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-orf-sm text-xs transition-colors ${
                      isActive
                        ? 'bg-orf-primary/10 text-orf-primary font-medium'
                        : 'text-orf-text-2 hover:text-orf-text hover:bg-orf-surface-2'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom items */}
        <div className="pt-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-orf-sm text-sm transition-colors ${
                  isActive
                    ? 'bg-orf-primary/10 text-orf-primary font-medium'
                    : 'text-orf-text-2 hover:text-orf-text hover:bg-orf-surface-2'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-orf-border">
        <p className="text-xs text-orf-text-3">v0.1.0 — Sprint 6</p>
      </div>
    </aside>
  )
}
