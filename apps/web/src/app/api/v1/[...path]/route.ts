/**
 * Catch-all proxy: Next.js → Fastify API (internal Docker network)
 * Browser calls /api/v1/* (same-origin) → this route forwards to ads-api:4000
 * Eliminates need for port 4000 to be publicly accessible.
 */
import { NextRequest, NextResponse } from 'next/server'

// Internal Docker URL — web container can reach api container by service name
const INTERNAL_API = process.env['INTERNAL_API_URL'] ?? 'http://ads-api:4000'

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const apiPath = path.join('/')
  const search = request.nextUrl.search

  const url = `${INTERNAL_API}/api/v1/${apiPath}${search}`

  const headers = new Headers()
  const auth = request.headers.get('authorization')
  if (auth) headers.set('authorization', auth)
  headers.set('x-forwarded-for', request.headers.get('x-forwarded-for') ?? '')
  headers.set('user-agent', request.headers.get('user-agent') ?? '')

  const body = request.method !== 'GET' && request.method !== 'HEAD'
    ? await request.text()
    : undefined

  // Only set Content-Type when there is an actual body — Fastify rejects empty bodies with this header
  if (body && body.length > 0) {
    headers.set('content-type', request.headers.get('content-type') ?? 'application/json')
  }

  const res = await fetch(url, {
    method: request.method,
    headers,
    body,
    signal: AbortSignal.timeout(300_000), // 5 min timeout for long syncs
  })

  const responseBody = await res.text()
  return new NextResponse(responseBody, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json',
    },
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
