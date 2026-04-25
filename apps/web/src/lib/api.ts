/**
 * Authenticated API client for Orffia Ads backend.
 * Handles token refresh transparently.
 */

import { useAuthStore } from '@/store/auth'

// All client calls go through Next.js proxy (/api/v1/*) — same-origin, no CORS issues
// The proxy route forwards to the internal Docker API service
const API_BASE = ''

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
    // Only set Content-Type when there is a body — Fastify rejects empty bodies with this header
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
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

  // 204 No Content — return empty data without parsing body
  if (res.status === 204) return { data: null } as unknown as { data: T }

  return res.json() as Promise<{ data: T }>
}

export const api = apiRequest
