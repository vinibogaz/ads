import type { FastifyInstance } from 'fastify'
import { eq, and, or } from 'drizzle-orm'
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
  const creds = integration.credentials as { accessToken?: string; refreshToken?: string; tokenExpiry?: number; tokenType?: string }

  // Private App tokens don't expire — return directly
  if (creds.tokenType === 'private_app' && creds.accessToken) return creds.accessToken
  if (!creds.accessToken) throw new Error('No access token — reconnect HubSpot')

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

  // POST /api/v1/crm/hubspot/connect-token — connect via Private App token
  app.post('/connect-token', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = z.object({
      token: z.string().min(10),
      name: z.string().optional(),
    }).parse(request.body)

    // Validate token by fetching account info
    const infoRes = await fetch('https://api.hubapi.com/account-info/v3/details', {
      headers: { Authorization: `Bearer ${body.token}` },
    })
    if (!infoRes.ok) {
      return reply.status(400).send({ error: 'INVALID_TOKEN', message: 'Token inválido ou sem permissão. Verifique os escopos do seu Private App.' })
    }
    const info = await infoRes.json() as { portalId: number; uiDomain: string; companyName?: string }

    const [row] = await db.insert(crmIntegrations).values({
      tenantId: request.user.tid,
      platform: 'hubspot',
      name: body.name || `HubSpot (${info.uiDomain ?? info.portalId})`,
      credentials: {
        accessToken: body.token,
        tokenType: 'private_app', // marks as non-expiring private app token
        hubId: info.portalId,
        hubDomain: info.uiDomain,
      },
      meta: { hubId: info.portalId, hubDomain: info.uiDomain, companyName: info.companyName },
      status: 'active',
    }).returning()

    return reply.status(201).send({ data: { ...row, credentials: undefined } })
  })

  // GET /api/v1/crm/hubspot/url
  app.get('/url', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!env.HUBSPOT_CLIENT_ID || !env.HUBSPOT_CLIENT_SECRET) {
      return reply.status(503).send({ error: 'HUBSPOT_NOT_CONFIGURED', message: 'HubSpot não configurado. Adicione HUBSPOT_CLIENT_ID e HUBSPOT_CLIENT_SECRET ao servidor.' })
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

  // POST /api/v1/crm/hubspot/sync/:id — sync ALL contacts + deals with full pagination
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

    // ── Helper: fetch ALL pages from HubSpot ──────────────────────────────
    async function fetchAllPages(path: string, params: Record<string, string>): Promise<any[]> {
      const all: any[] = []
      let after: string | undefined = undefined
      do {
        const pageParams = { ...params, limit: '100', ...(after ? { after } : {}) }
        const data = await hsGet(token, path, pageParams) as { results: any[]; paging?: { next?: { after: string } } }
        all.push(...(data.results ?? []))
        after = data.paging?.next?.after
      } while (after)
      return all
    }

    // ── Sync contacts → leads ─────────────────────────────────────────────
    const contacts = await fetchAllPages('/crm/v3/objects/contacts', {
      properties: 'firstname,lastname,email,phone,company,hs_lead_status,hs_lifecycle_stage,createdate,hs_analytics_source,hs_analytics_source_data_1,hs_analytics_first_url',
    })

    let synced = 0
    let updated = 0

    // Map HubSpot lifecycle stage to our lead status
    const mapLifecycleStatus = (lifecycle: string, dealStage?: string): string => {
      if (dealStage === 'closedwon') return 'won'
      if (dealStage === 'closedlost') return 'lost'
      switch (lifecycle) {
        case 'customer': return 'won'
        case 'opportunity': return 'opportunity'
        case 'salesqualifiedlead': return 'qualified'
        case 'marketingqualifiedlead': return 'qualified'
        case 'lead': return 'new'
        case 'subscriber': return 'new'
        default: return 'new'
      }
    }

    for (const contact of contacts) {
      const p = contact.properties ?? {}
      const email = (p.email ?? '').toLowerCase().trim()
      const name = [p.firstname, p.lastname].filter(Boolean).join(' ') || null
      const externalId = String(contact.id)
      const status = mapLifecycleStatus(p.hs_lifecycle_stage ?? '')

      // Deduplication: 1st by externalId+crmIntegration, 2nd by email in tenant
      let existing = await db.query.leads.findFirst({
        where: and(
          eq(leads.tenantId, request.user.tid),
          eq(leads.crmIntegrationId, id),
          eq(leads.externalId, externalId)
        ),
      })

      // Fallback: match by email if no externalId match found
      if (!existing && email) {
        existing = await db.query.leads.findFirst({
          where: and(
            eq(leads.tenantId, request.user.tid),
            eq(leads.email, email)
          ),
        })
      }

      if (existing) {
        // Update existing lead — never change status backwards (e.g. won→new)
        const STATUS_RANK: Record<string, number> = { new: 0, no_contact: 1, contacted: 2, qualified: 3, unqualified: 3, opportunity: 4, won: 5, lost: 5 }
        const keepStatus = (STATUS_RANK[existing.status] ?? 0) >= (STATUS_RANK[status] ?? 0)
        await db.update(leads).set({
          externalId, // link by externalId going forward
          crmIntegrationId: id,
          name: name || existing.name,
          email: email || existing.email,
          phone: p.phone || existing.phone,
          company: p.company || existing.company,
          status: keepStatus ? existing.status : status as any,
          utmSource: p.hs_analytics_source || existing.utmSource,
          updatedAt: new Date(),
        }).where(eq(leads.id, existing.id))
        updated++
      } else {
        await db.insert(leads).values({
          tenantId: request.user.tid,
          clientId: body.clientId ?? null,
          crmIntegrationId: id,
          externalId,
          name,
          email: email || null,
          phone: p.phone || null,
          company: p.company || null,
          utmSource: p.hs_analytics_source || null,
          status: status as any,
          meta: {
            hsLifecycleStage: p.hs_lifecycle_stage,
            hsSource: p.hs_analytics_source,
            hsSourceDetail: p.hs_analytics_source_data_1,
            firstUrl: p.hs_analytics_first_url,
          },
        })
        synced++
      }
    }

    // ── Sync deals → revenue + status + funnel stage ──────────────────────
    if (body.syncDeals) {
      const deals = await fetchAllPages('/crm/v3/objects/deals', {
        properties: 'dealname,amount,closedate,dealstage,pipeline,createdate,mrr',
        associations: 'contacts',
      })

      let dealsUpdated = 0
      for (const deal of deals) {
        const p = deal.properties ?? {}
        const contactIds: string[] = (deal.associations?.contacts?.results ?? []).map((c: any) => String(c.id))
        if (contactIds.length === 0) continue

        const isWon = p.dealstage === 'closedwon'
        const isLost = p.dealstage === 'closedlost'
        const stageId = await mapStage(request.user.tid, id, p.dealstage)
        const dealStatus = isWon ? 'won' : isLost ? 'lost' : undefined

        for (const contactId of contactIds) {
          const lead = await db.query.leads.findFirst({
            where: and(
              eq(leads.tenantId, request.user.tid),
              eq(leads.crmIntegrationId, id),
              eq(leads.externalId, contactId)
            ),
          })
          if (!lead) continue

          await db.update(leads).set({
            value: p.amount ? String(p.amount) : lead.value,
            mrr: p.mrr ? String(p.mrr) : lead.mrr,
            closedAt: isWon && p.closedate ? new Date(p.closedate) : lead.closedAt,
            ...(dealStatus ? { status: dealStatus as any } : {}),
            stageId: stageId ?? lead.stageId,
            updatedAt: new Date(),
          }).where(eq(leads.id, lead.id))
          dealsUpdated++
        }
      }
      synced += dealsUpdated
    }

    await db.update(crmIntegrations)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(crmIntegrations.id, id))

    return reply.send({
      data: {
        contacts: contacts.length,
        created: synced,
        updated,
        total: synced + updated,
      }
    })
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

    return reply.send({ data: { pipelines } })
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
