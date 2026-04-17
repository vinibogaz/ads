/**
 * Authenticated API client for Synthex backend.
 * Handles token refresh transparently.
 */

import { useAuthStore } from '@/store/auth'

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch('/api/auth/refresh', { method: 'POST' })
  if (!res.ok) return null
  const data = await res.json()
  const token = data?.data?.accessToken as string | undefined
  if (token) {
    useAuthStore.getState().setTokens(token)
    return token
  }
  return null
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T }> {
  let token = useAuthStore.getState().accessToken

  if (!token) {
    token = await refreshAccessToken()
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/api/v1${path}`, { ...options, headers })

  if (res.status === 401 && token) {
    // Token may be expired — try refresh once
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      const retried = await fetch(`${API_BASE}/api/v1${path}`, { ...options, headers })
      if (!retried.ok) {
        useAuthStore.getState().clearTokens()
        window.location.href = '/login'
        throw new Error('Session expired')
      }
      return retried.json() as Promise<{ data: T }>
    }
    useAuthStore.getState().clearTokens()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }))
    throw Object.assign(new Error(err.message ?? 'Request failed'), { status: res.status, ...err })
  }

  return res.json() as Promise<{ data: T }>
}
