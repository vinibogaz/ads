import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, adsPlatformIntegrations, offlineConversions, leads } from '@ads/db'
import { z } from 'zod'
import { env } from '../config/env.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v17'

const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
  'email',
  'profile',
].join(' ')

function frontendUrl() {
  return env.CORS_ORIGIN?.startsWith('http') ? env.CORS_ORIGIN : `https://${env.CORS_ORIGIN ?? 'ads.orffia.com'}`
}

function buildOAuthUrl(state: string) {
  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID!)
  url.searchParams.set('redirect_uri', env.GOOGLE_ADS_REDIRECT_URI!)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  return url.toString()
}

async function exchangeCode(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_ADS_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(err.error_description ?? 'Failed to exchange Google Ads code')
  }
  const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number; id_token?: string }
  let email = ''
  if (data.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(data.id_token.split('.')[1]!, 'base64url').toString())
      email = payload.email ?? ''
    } catch {}
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    tokenExpiry: Date.now() + (data.expires_in - 60) * 1000,
    email,
  }
}

async function getValidToken(integrationId: string, tenantId: string): Promise<string> {
  const integration = await db.query.adsPlatformIntegrations.findFirst({
    where: and(eq(adsPlatformIntegrations.id, integrationId), eq(adsPlatformIntegrations.tenantId, tenantId)),
  })
  if (!integration) throw new Error('Integration not found')
  const creds = integration.credentials as { accessToken?: string; refreshToken?: string; tokenExpiry?: number }
  if (!creds.refreshToken) throw new Error('No refresh token — please reconnect Google Ads')

  const isExpired = !creds.tokenExpiry || Date.now() > creds.tokenExpiry
  if (!isExpired && creds.accessToken) return creds.accessToken

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: creds.refreshToken,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh Google Ads token')
  const data = await res.json() as { access_token: string; expires_in: number }
  const newCreds = { ...creds, accessToken: data.access_token, tokenExpiry: Date.now() + (data.expires_in - 60) * 1000 }
  await db.update(adsPlatformIntegrations).set({ credentials: newCreds, updatedAt: new Date() }).where(eq(adsPlatformIntegrations.id, integrationId))
  return data.access_token
}

function adsHeaders(token: string, customerId?: string) {
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (env.GOOGLE_ADS_DEVELOPER_TOKEN) h['developer-token'] = env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (customerId) h['login-customer-id'] = customerId.replace(/-/g, '')
  return h
}

export async function googleAdsRoutes(app: FastifyInstance) {

  // GET /api/v1/auth/google-ads/url
  app.get('/google-ads/url', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return reply.status(503).send({ error: 'GOOGLE_NOT_CONFIGURED' })
    }
    const state = Buffer.from(JSON.stringify({ tid: request.user.tid, uid: request.user.sub })).toString('base64url')
    return reply.send({ data: { url: buildOAuthUrl(state) } })
  })

  // GET /api/v1/auth/google-ads/callback
  app.get('/google-ads/callback', { config: { skipAuth: true } }, async (request, reply) => {
    const { code, state, error } = request.query as Record<string, string>
    const base = frontendUrl()
    if (error || !code || !state) return reply.redirect(`${base}/integrations?error=google_ads_denied`)

    let tid: string
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
      tid = parsed.tid
      if (!tid) throw new Error()
    } catch {
      return reply.redirect(`${base}/integrations?error=google_ads_state_invalid`)
    }

    try {
      const tokens = await exchangeCode(code)
      const [row] = await db.insert(adsPlatformIntegrations).values({
        tenantId: tid,
        platform: 'google',
        name: tokens.email ? `Google Ads (${tokens.email})` : 'Google Ads',
        accountId: '',
        credentials: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenExpiry: tokens.tokenExpiry },
        meta: { googleEmail: tokens.email },
        status: 'pending',
      }).returning()
      if (!row) throw new Error('Failed to create integration')
      return reply.redirect(`${base}/integrations?google_ads_setup=${row.id}`)
    } catch (e: any) {
      app.log.error({ err: e.message }, 'Google Ads OAuth callback failed')
      return reply.redirect(`${base}/integrations?error=google_ads_token_failed`)
    }
  })

  // POST /api/v1/auth/google-ads/sync/:id — sync metrics
  app.post('/google-ads/sync/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) {
      return reply.status(503).send({ error: 'DEVELOPER_TOKEN_NOT_CONFIGURED', message: 'Google Ads Developer Token não configurado' })
    }

    const integration = await db.query.adsPlatformIntegrations.findFirst({
      where: and(eq(adsPlatformIntegrations.id, id), eq(adsPlatformIntegrations.tenantId, request.user.tid)),
    })
    if (!integration) return reply.status(404).send({ error: 'NOT_FOUND' })
    if (!integration.accountId) return reply.status(400).send({ error: 'NO_CUSTOMER_ID', message: 'Configure o Customer ID antes de sincronizar' })

    let token: string
    try { token = await getValidToken(id, request.user.tid) } catch (e: any) {
      return reply.status(400).send({ error: 'TOKEN_ERROR', message: e.message })
    }

    const customerId = integration.accountId.replace(/-/g, '')

    // Query account-level summary for current month
    const summaryQuery = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM customer
      WHERE segments.date DURING THIS_MONTH
    `

    // Query campaigns
    const campaignsQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM campaign
      WHERE segments.date DURING THIS_MONTH
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
    `

    const [summaryRes, campaignsRes] = await Promise.all([
      fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:search`, {
        method: 'POST',
        headers: adsHeaders(token),
        body: JSON.stringify({ query: summaryQuery }),
      }),
      fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:search`, {
        method: 'POST',
        headers: adsHeaders(token),
        body: JSON.stringify({ query: campaignsQuery }),
      }),
    ])

    if (!summaryRes.ok) {
      const err = await summaryRes.json().catch(() => ({})) as any
      const msg = err.error?.message ?? err.error?.details?.[0]?.errors?.[0]?.message ?? 'Failed to fetch Google Ads data'
      app.log.error({ err, integrationId: id }, 'Google Ads summary fetch failed')
      return reply.status(502).send({ error: 'GOOGLE_ADS_ERROR', message: msg })
    }

    const summaryData = await summaryRes.json() as { results?: any[] }
    const s = summaryData.results?.[0]?.metrics
    const impressions = parseInt(s?.impressions ?? '0')
    const clicks = parseInt(s?.clicks ?? '0')
    const costMicros = parseInt(s?.costMicros ?? s?.cost_micros ?? '0')
    const spend = costMicros / 1_000_000
    const ctr = parseFloat(s?.ctr ?? '0') * 100
    const cpc = (s?.averageCpc ?? s?.average_cpc) ? parseInt(s?.averageCpc ?? s?.average_cpc) / 1_000_000 : 0
    const cpm = (s?.averageCpm ?? s?.average_cpm) ? parseInt(s?.averageCpm ?? s?.average_cpm) / 1_000_000 : 0

    const campaignsData = await campaignsRes.json() as { results?: any[] }
    const campaigns = (campaignsData.results ?? []).map((r: any) => ({
      id: r.campaign?.id,
      name: r.campaign?.name,
      status: r.campaign?.status,
      impressions: parseInt(r.metrics?.impressions ?? '0'),
      clicks: parseInt(r.metrics?.clicks ?? '0'),
      spend: parseInt(r.metrics?.costMicros ?? r.metrics?.cost_micros ?? '0') / 1_000_000,
      ctr: parseFloat(r.metrics?.ctr ?? '0') * 100,
      cpc: r.metrics?.averageCpc ?? r.metrics?.average_cpc ? parseInt(r.metrics?.averageCpc ?? r.metrics?.average_cpc) / 1_000_000 : 0,
      cpm: r.metrics?.averageCpm ?? r.metrics?.average_cpm ? parseInt(r.metrics?.averageCpm ?? r.metrics?.average_cpm) / 1_000_000 : 0,
    }))

    await db.update(adsPlatformIntegrations).set({
      lastSyncAt: new Date(),
      updatedAt: new Date(),
      meta: {
        ...(integration.meta as object ?? {}),
        impressions, clicks, spend,
        ctr: Math.round(ctr * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        cpm: Math.round(cpm * 100) / 100,
        campaigns,
        lastSyncPeriod: 'THIS_MONTH',
      },
    }).where(eq(adsPlatformIntegrations.id, id))

    return reply.send({
      data: { impressions, clicks, spend: Math.round(spend * 100) / 100, ctr: Math.round(ctr * 100) / 100, cpc: Math.round(cpc * 100) / 100, cpm: Math.round(cpm * 100) / 100, campaigns: campaigns.length }
    })
  })

  // POST /api/v1/auth/google-ads/upload-conversion — upload offline conversion
  app.post('/google-ads/upload-conversion', { preHandler: [app.authenticate] }, async (request, reply) => {
    const schema = z.object({
      integrationId: z.string().uuid(),
      gclid: z.string().min(1),
      conversionActionId: z.string().min(1), // e.g. "12345678"
      conversionDateTime: z.string().optional(), // ISO format, defaults to now
      conversionValue: z.number().optional(),
      currencyCode: z.string().default('BRL'),
      leadId: z.string().uuid().optional(),
    })
    const body = schema.parse(request.body)
    if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) {
      return reply.status(503).send({ error: 'DEVELOPER_TOKEN_NOT_CONFIGURED' })
    }

    const integration = await db.query.adsPlatformIntegrations.findFirst({
      where: and(eq(adsPlatformIntegrations.id, body.integrationId), eq(adsPlatformIntegrations.tenantId, request.user.tid)),
    })
    if (!integration) return reply.status(404).send({ error: 'NOT_FOUND' })

    let token: string
    try { token = await getValidToken(body.integrationId, request.user.tid) } catch (e: any) {
      return reply.status(400).send({ error: 'TOKEN_ERROR', message: e.message })
    }

    const customerId = integration.accountId!.replace(/-/g, '')
    const conversionTime = body.conversionDateTime
      ? new Date(body.conversionDateTime).toISOString().replace('T', ' ').replace('.000Z', '+00:00')
      : new Date().toISOString().replace('T', ' ').replace('.000Z', '+00:00')

    const conversion: any = {
      gclid: body.gclid,
      conversionAction: `customers/${customerId}/conversionActions/${body.conversionActionId}`,
      conversionDateTime: conversionTime,
    }
    if (body.conversionValue != null) {
      conversion.conversionValue = body.conversionValue
      conversion.currencyCode = body.currencyCode
    }

    const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}:uploadClickConversions`, {
      method: 'POST',
      headers: adsHeaders(token),
      body: JSON.stringify({ conversions: [conversion], partialFailure: true }),
    })

    const data = await res.json() as any
    if (!res.ok) {
      const msg = data.error?.message ?? 'Failed to upload conversion'
      app.log.error({ err: data, integrationId: body.integrationId }, 'Google Ads conversion upload failed')
      // Save as error in offlineConversions
      if (body.leadId) {
        await db.insert(offlineConversions).values({
          tenantId: request.user.tid,
          leadId: body.leadId,
          integrationId: body.integrationId,
          platform: 'google',
          event: 'purchase',
          externalId: body.gclid,
          status: 'error',
          payload: body as any,
          sentAt: new Date(),
        })
      }
      return reply.status(502).send({ error: 'UPLOAD_FAILED', message: msg })
    }

    // Save success record
    if (body.leadId) {
      await db.insert(offlineConversions).values({
        tenantId: request.user.tid,
        leadId: body.leadId,
        integrationId: body.integrationId,
        platform: 'google',
        event: 'purchase',
        externalId: body.gclid,
        status: 'active',
        payload: body as any,
        sentAt: new Date(),
      })
    }

    return reply.send({ data: { success: true, result: data } })
  })

  // PATCH /api/v1/auth/google-ads/setup/:id — complete setup (set customerId + name)
  app.patch('/google-ads/setup/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({
      name: z.string().min(1).optional(),
      customerId: z.string().min(1), // e.g. "123-456-7890" or "1234567890"
      clientId: z.string().uuid().optional(),
    }).parse(request.body)

    const existing = await db.query.adsPlatformIntegrations.findFirst({
      where: and(eq(adsPlatformIntegrations.id, id), eq(adsPlatformIntegrations.tenantId, request.user.tid)),
    })
    if (!existing) return reply.status(404).send({ error: 'NOT_FOUND' })

    const [updated] = await db.update(adsPlatformIntegrations).set({
      name: body.name ?? existing.name,
      accountId: body.customerId.replace(/-/g, ''),
      clientId: body.clientId ?? existing.clientId,
      status: 'active',
      updatedAt: new Date(),
    }).where(eq(adsPlatformIntegrations.id, id)).returning()

    return reply.send({ data: { ...updated, credentials: undefined } })
  })
}
