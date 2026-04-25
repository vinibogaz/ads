import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, googleSheetsIntegrations } from '@ads/db'
import { env } from '../config/env.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'email',
  'profile',
].join(' ')

function frontendUrl() {
  return env.CORS_ORIGIN?.startsWith('http') ? env.CORS_ORIGIN : `https://${env.CORS_ORIGIN ?? 'ads.orffia.com'}`
}

function buildGoogleOAuthUrl(state: string) {
  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID!)
  url.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI!)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('access_type', 'offline')   // get refresh_token
  url.searchParams.set('prompt', 'consent')          // always show consent to guarantee refresh_token
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string
  refreshToken: string
  tokenExpiry: number
  email: string
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(err.error_description ?? 'Failed to exchange Google code')
  }
  const data = await res.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
    id_token?: string
  }

  // Decode id_token (JWT) to get email — no signature verification needed here
  let email = 'unknown@google.com'
  if (data.id_token) {
    const payload = JSON.parse(Buffer.from(data.id_token.split('.')[1]!, 'base64url').toString())
    email = payload.email ?? email
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    tokenExpiry: Date.now() + (data.expires_in - 60) * 1000,
    email,
  }
}

// Refresh an expired access token
export async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; tokenExpiry: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(err.error_description ?? 'Failed to refresh Google token')
  }
  const data = await res.json() as { access_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    tokenExpiry: Date.now() + (data.expires_in - 60) * 1000,
  }
}

// Get a valid access token for an integration (refreshes if expired)
export async function getValidGoogleToken(integrationId: string, tenantId: string): Promise<string> {
  const integration = await db.query.googleSheetsIntegrations.findFirst({
    where: and(
      eq(googleSheetsIntegrations.id, integrationId),
      eq(googleSheetsIntegrations.tenantId, tenantId),
    ),
  })
  if (!integration) throw new Error('Integration not found')

  const creds = integration.credentials as {
    accessToken?: string
    refreshToken?: string
    tokenExpiry?: number
  }
  if (!creds.refreshToken) throw new Error('No refresh token — please reconnect Google')

  const isExpired = !creds.tokenExpiry || Date.now() > creds.tokenExpiry
  if (!isExpired && creds.accessToken) return creds.accessToken

  // Refresh
  const { accessToken, tokenExpiry } = await refreshGoogleToken(creds.refreshToken)
  await db.update(googleSheetsIntegrations)
    .set({ credentials: { ...creds, accessToken, tokenExpiry }, updatedAt: new Date() })
    .where(eq(googleSheetsIntegrations.id, integrationId))

  return accessToken
}

export async function googleOAuthRoutes(app: FastifyInstance) {

  // GET /api/v1/auth/google/url — returns OAuth URL (requires auth)
  app.get('/google/url', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return reply.status(503).send({ error: 'GOOGLE_NOT_CONFIGURED', message: 'Google integration not configured' })
    }
    const state = Buffer.from(JSON.stringify({
      tid: request.user.tid,
      uid: request.user.sub,
    })).toString('base64url')
    return reply.send({ data: { url: buildGoogleOAuthUrl(state) } })
  })

  // GET /api/v1/auth/google/callback — Google redirects here (no auth)
  app.get('/google/callback', { config: { skipAuth: true } }, async (request, reply) => {
    const { code, state, error } = request.query as Record<string, string>
    const base = frontendUrl()

    if (error || !code || !state) {
      return reply.redirect(`${base}/integrations?error=google_denied`)
    }

    let tid: string
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
      tid = parsed.tid
      if (!tid) throw new Error('missing tid')
    } catch {
      return reply.redirect(`${base}/integrations?error=google_state_invalid`)
    }

    try {
      const tokens = await exchangeGoogleCode(code)

      // Create a pending integration record — frontend will complete setup
      const [row] = await db.insert(googleSheetsIntegrations).values({
        tenantId: tid,
        name: `Google Sheets (${tokens.email})`,
        spreadsheetId: '',
        sheetName: 'Sheet1',
        fieldMapping: {
          name: 'A', email: 'B', phone: 'C', company: 'D',
          status: 'E', utmSource: 'F', utmMedium: 'G', utmCampaign: 'H',
          value: 'I', mrr: 'J', closedAt: 'K', createdAt: 'L',
        },
        credentials: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiry: tokens.tokenExpiry,
        },
        googleEmail: tokens.email,
        status: 'pending',
      }).returning()

      if (!row) throw new Error('Failed to create integration record')
      return reply.redirect(`${base}/integrations?google_setup=${row.id}`)
    } catch (e: any) {
      app.log.error({ err: e.message }, 'Google OAuth callback failed')
      return reply.redirect(`${base}/integrations?error=google_token_failed`)
    }
  })

  // GET /api/v1/auth/google/spreadsheet-meta?spreadsheetId=xxx&integrationId=xxx
  // Returns the title and sheet tabs of a spreadsheet
  app.get('/google/spreadsheet-meta', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { spreadsheetId, integrationId } = request.query as { spreadsheetId?: string; integrationId?: string }
    if (!spreadsheetId || !integrationId) {
      return reply.status(400).send({ error: 'MISSING_PARAMS', message: 'spreadsheetId and integrationId required' })
    }

    let token: string
    try {
      token = await getValidGoogleToken(integrationId, request.user.tid)
    } catch (e: any) {
      return reply.status(400).send({ error: 'TOKEN_ERROR', message: e.message })
    }

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any
      const msg = err.error?.message ?? 'Failed to access spreadsheet'
      if (res.status === 403 || res.status === 404) {
        return reply.status(400).send({ error: 'SHEET_ACCESS_FAILED', message: 'Não foi possível acessar a planilha. Verifique o ID e as permissões.' })
      }
      return reply.status(502).send({ error: 'SHEETS_API_ERROR', message: msg })
    }

    const data = await res.json() as {
      properties: { title: string }
      sheets: { properties: { sheetId: number; title: string } }[]
    }

    return reply.send({
      data: {
        title: data.properties.title,
        sheets: data.sheets.map((s) => ({ id: s.properties.sheetId, title: s.properties.title })),
      },
    })
  })
}
