import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, crmIntegrations, leads, funnelStages } from '@ads/db'
import { z } from 'zod'
import { env } from '../config/env.js'

const HS_AUTH_URL   = 'https://app.hubspot.com/oauth/authorize'
const HS_TOKEN_URL  = 'https://api.hubapi.com/oauth/v1/token'
const HS_API        = 'https://api.hubapi.com'

const SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.deals.read',
  'crm.objects.companies.read',
  'crm.schemas.deals.read',
].join(' ')

function frontendUrl() {
  return env.CORS_ORIGIN?.startsWith('http') ? env.CORS_ORIGIN : `https://${env.CORS_ORIGIN ?? 'ads.orffia.com'}`
}

function buildOAuthUrl(state: string) {
  const url = new URL(HS_AUTH_URL)
  url.searchParams.set('client_id', env.HUBSPOT_CLIENT_ID!)
  url.searchParams.set('redirect_uri', env.HUBSPOT_REDIRECT_URI!)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('state', state)
  return url.toString()
}

async function exchangeCode(code: string) {
  const res = await fetch(HS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.HUBSPOT_CLIENT_ID!,
      client_secret: env.HUBSPOT_CLIENT_SECRET!,
      redirect_uri: env.HUBSPOT_REDIRECT_URI!,
      code,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(err.message ?? 'Failed to exchange HubSpot code')
  }
  return res.json() as Promise<{
    access_token: string; refresh_token: string; expires_in: number;
    hub_id: number; hub_domain: string; token_type: string;
  }>
}

async function getValidToken(integrationId: string, tenantId: string): Promise<string> {
  const integration = await db.query.crmIntegrations.findFirst({
    where: and(eq(crmIntegrations.id, integrationId), eq(crmIntegrations.tenantId, tenantId)),
  })
  if (!integration) throw new Error('Integration not found')
  const creds = integration.credentials as { accessToken?: string; refreshToken?: string; tokenExpiry?: number }
  if (!creds.refreshToken) throw new Error('No refresh token — reconnect HubSpot')

  const isExpired = !creds.tokenExpiry || Date.now() > creds.tokenExpiry
  if (!isExpired && creds.accessToken) return creds.accessToken

  const res = await fetch(HS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.HUBSPOT_CLIENT_ID!,
      client_secret: env.HUBSPOT_CLIENT_SECRET!,
      refresh_token: creds.refreshToken,
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh HubSpot token')
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
  const newCreds = {
    ...creds,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry: Date.now() + (data.expires_in - 60) * 1000,
  }
  await db.update(crmIntegrations).set({ credentials: newCreds, updatedAt: new Date() }).where(eq(crmIntegrations.id, integrationId))
  return data.access_token
}

async function hsGet(token: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${HS_API}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(err.message ?? `HubSpot API error: ${res.status}`)
  }
  return res.json()
}

// Map HubSpot deal stage to our funnel stage
async function mapStage(tenantId: string, integrationId: string, hsDealStage: string): Promise<string | null> {
  const integration = await db.query.crmIntegrations.findFirst({
    where: and(eq(crmIntegrations.id, integrationId), eq(crmIntegrations.tenantId, tenantId)),
  })
  if (!integration) return null
  const mapping = integration.funnelMapping as Record<string, string>
  return mapping[hsDealStage] ?? null
}

export async function hubspotRoutes(app: FastifyInstance) {

  // GET /api/v1/crm/hubspot/url
  app.get('/url', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!env.HUBSPOT_CLIENT_ID || !env.HUBSPOT_CLIENT_SECRET) {
      return reply.status(503).send({ error: 'HUBSPOT_NOT_CONFIGURED' })
    }
    const state = Buffer.from(JSON.stringify({ tid: request.user.tid, uid: request.user.sub })).toString('base64url')
    return reply.send({ data: { url: buildOAuthUrl(state) } })
  })

  // GET /api/v1/crm/hubspot/callback
  app.get('/callback', { config: { skipAuth: true } }, async (request, reply) => {
    const { code, state, error } = request.query as Record<string, string>
    const base = frontendUrl()
    if (error || !code || !state) return reply.redirect(`${base}/integrations?error=hubspot_denied`)

    let tid: string
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
      tid = parsed.tid
      if (!tid) throw new Error()
    } catch {
      return reply.redirect(`${base}/integrations?error=hubspot_state_invalid`)
    }

    try {
      const tokens = await exchangeCode(code)
      const [row] = await db.insert(crmIntegrations).values({
        tenantId: tid,
        platform: 'hubspot',
        name: `HubSpot (${tokens.hub_domain ?? tokens.hub_id})`,
        credentials: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: Date.now() + (tokens.expires_in - 60) * 1000,
          hubId: tokens.hub_id,
          hubDomain: tokens.hub_domain,
        },
        meta: { hubId: tokens.hub_id, hubDomain: tokens.hub_domain },
        status: 'active',
      }).returning()
      if (!row) throw new Error('Failed to create integration')
      return reply.redirect(`${base}/integrations?hubspot_connected=${row.id}`)
    } catch (e: any) {
      app.log.error({ err: e.message }, 'HubSpot OAuth callback failed')
      return reply.redirect(`${base}/integrations?error=hubspot_token_failed`)
    }
  })

  // POST /api/v1/crm/hubspot/sync/:id — sync contacts + deals
  app.post('/sync/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({
      clientId: z.string().uuid().optional(),
      syncDeals: z.boolean().default(true),
    }).parse(request.body ?? {})

    const integration = await db.query.crmIntegrations.findFirst({
      where: and(eq(crmIntegrations.id, id), eq(crmIntegrations.tenantId, request.user.tid)),
    })
    if (!integration) return reply.status(404).send({ error: 'NOT_FOUND' })

    let token: string
    try { token = await getValidToken(id, request.user.tid) } catch (e: any) {
      return reply.status(400).send({ error: 'TOKEN_ERROR', message: e.message })
    }

    // Fetch contacts (up to 100 per page, we'll do one pass for now)
    const contactsData = await hsGet(token, '/crm/v3/objects/contacts', {
      limit: '100',
      properties: 'firstname,lastname,email,phone,company,hs_lead_status,createdate,hs_analytics_source,hs_analytics_first_url,hubspot_owner_id',
      sorts: 'createdate',
    }) as { results: any[]; paging?: any }

    let synced = 0
    let updated = 0

    for (const contact of contactsData.results ?? []) {
      const p = contact.properties ?? {}
      const email = p.email ?? ''
      const name = [p.firstname, p.lastname].filter(Boolean).join(' ')
      const externalId = contact.id

      // Check existing lead
      const existing = await db.query.leads.findFirst({
        where: and(
          eq(leads.tenantId, request.user.tid),
          eq(leads.crmIntegrationId, id),
          eq(leads.externalId, externalId)
        ),
      })

      const utmSource = p.hs_analytics_source ?? ''

      if (existing) {
        await db.update(leads).set({
          name: name || existing.name,
          email: email || existing.email,
          phone: p.phone || existing.phone,
          company: p.company || existing.company,
          updatedAt: new Date(),
        }).where(eq(leads.id, existing.id))
        updated++
      } else {
        await db.insert(leads).values({
          tenantId: request.user.tid,
          clientId: body.clientId ?? null,
          crmIntegrationId: id,
          externalId,
          name: name || null,
          email: email || null,
          phone: p.phone || null,
          company: p.company || null,
          utmSource: utmSource || null,
          status: 'new',
          meta: { hsSource: p.hs_analytics_source, firstUrl: p.hs_analytics_first_url },
        })
        synced++
      }
    }

    // Sync deals → update lead revenue fields
    if (body.syncDeals) {
      const dealsData = await hsGet(token, '/crm/v3/objects/deals', {
        limit: '100',
        properties: 'dealname,amount,closedate,dealstage,hs_deal_stage_probability,pipeline,createdate,mrr',
        associations: 'contacts',
      }) as { results: any[] }

      let dealsUpdated = 0
      for (const deal of dealsData.results ?? []) {
        const p = deal.properties ?? {}
        const contactIds = (deal.associations?.contacts?.results ?? []).map((c: any) => c.id)
        if (contactIds.length === 0) continue

        for (const contactId of contactIds) {
          const lead = await db.query.leads.findFirst({
            where: and(
              eq(leads.tenantId, request.user.tid),
              eq(leads.crmIntegrationId, id),
              eq(leads.externalId, contactId)
            ),
          })
          if (!lead) continue

          const isWon = p.dealstage === 'closedwon'
          const stageId = await mapStage(request.user.tid, id, p.dealstage)

          await db.update(leads).set({
            value: p.amount ? String(p.amount) : lead.value,
            mrr: p.mrr ? String(p.mrr) : lead.mrr,
            closedAt: isWon && p.closedate ? new Date(p.closedate) : lead.closedAt,
            status: isWon ? 'won' : (p.dealstage === 'closedlost' ? 'lost' : lead.status),
            stageId: stageId ?? lead.stageId,
            updatedAt: new Date(),
          }).where(eq(leads.id, lead.id))
          dealsUpdated++
        }
      }
      synced += dealsUpdated
    }

    await db.update(crmIntegrations).set({ lastSyncAt: new Date(), updatedAt: new Date() }).where(eq(crmIntegrations.id, id))

    return reply.send({ data: { synced, updated, total: synced + updated } })
  })

  // GET /api/v1/crm/hubspot/pipeline/:id — fetch HubSpot deal stages for funnel mapping
  app.get('/pipeline/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const integration = await db.query.crmIntegrations.findFirst({
      where: and(eq(crmIntegrations.id, id), eq(crmIntegrations.tenantId, request.user.tid)),
    })
    if (!integration) return reply.status(404).send({ error: 'NOT_FOUND' })

    let token: string
    try { token = await getValidToken(id, request.user.tid) } catch (e: any) {
      return reply.status(400).send({ error: 'TOKEN_ERROR', message: e.message })
    }

    const data = await hsGet(token, '/crm/v3/pipelines/deals') as { results: any[] }
    const pipelines = (data.results ?? []).map((p: any) => ({
      id: p.id,
      label: p.label,
      stages: (p.stages ?? []).map((s: any) => ({ id: s.id, label: s.label, probability: s.metadata?.probability })),
    }))

    return reply.send({ data: pipelines })
  })

  // PATCH /api/v1/crm/hubspot/mapping/:id — save funnel stage mapping
  app.patch('/mapping/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({
      funnelMapping: z.record(z.string().nullable()),
    }).parse(request.body)

    const existing = await db.query.crmIntegrations.findFirst({
      where: and(eq(crmIntegrations.id, id), eq(crmIntegrations.tenantId, request.user.tid)),
    })
    if (!existing) return reply.status(404).send({ error: 'NOT_FOUND' })

    const [updated] = await db.update(crmIntegrations)
      .set({ funnelMapping: body.funnelMapping, updatedAt: new Date() })
      .where(eq(crmIntegrations.id, id))
      .returning()

    return reply.send({ data: { ...updated, credentials: undefined } })
  })
}
