import type { FastifyInstance } from 'fastify'
import { eq, and, or, inArray } from 'drizzle-orm'
import { db, crmIntegrations, leads, funnelStages } from '@ads/db'
import { runHubSpotContactSync } from '../services/hubspot-sync.js'
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

    // Prevent multiple concurrent syncs
    if ((integration as any).syncStatus === 'syncing') {
      return reply.status(409).send({ error: 'ALREADY_SYNCING', message: 'Sync já em andamento' })
    }

    // Mark as syncing immediately so frontend can show progress
    await db.update(crmIntegrations)
      .set({ syncStatus: 'syncing', syncProgress: 0, syncMessage: 'Iniciando...', updatedAt: new Date() })
      .where(eq(crmIntegrations.id, id))

    // Return 202 immediately — frontend polls progress
    reply.status(202).send({ data: { status: 'syncing' } })

    // Run sync in background — completely detached from request lifecycle
    setImmediate(async () => {
      app.log.info({ integrationId: id }, 'HubSpot background sync setImmediate started')
      const setProgress = async (progress: number, message: string) => {
        try {
          await db.update(crmIntegrations)
            .set({ syncProgress: progress, syncMessage: message, updatedAt: new Date() })
            .where(eq(crmIntegrations.id, id))
        } catch {}
      }

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

      async function fetchAllPages(path: string, params: Record<string, string>): Promise<any[]> {
        const all: any[] = []
        let after: string | undefined = undefined
        do {
          const pageParams = { ...params, limit: '100', ...(after ? { after } : {}) }
          let retries = 3; let data: any
          while (retries > 0) {
            try { data = await hsGet(token, path, pageParams); break }
            catch (e: any) {
              if (e.message?.includes('limit') && retries > 1) { await sleep(3000); retries-- }
              else throw e
            }
          }
          all.push(...(data.results ?? []))
          after = data.paging?.next?.after
          if (after) await sleep(400)
        } while (after)
        return all
      }

      try {
        await setProgress(5, 'Buscando contatos no HubSpot...')
        const contacts = await fetchAllPages('/crm/v3/objects/contacts', {
          properties: 'firstname,lastname,email,phone,company,hs_lead_status,hs_lifecycle_stage,createdate,hs_analytics_source,hs_analytics_source_data_1,hs_analytics_source_data_2,hs_analytics_first_url',
        })
        app.log.info({ integrationId: id, total: contacts.length }, 'HubSpot contacts fetched')

        await setProgress(30, `${contacts.length} contatos encontrados. Sincronizando...`)
        const { created, updated } = await runHubSpotContactSync(request.user.tid, id, contacts, body.clientId)
        app.log.info({ integrationId: id, created, updated }, 'HubSpot contacts synced')

        await setProgress(70, `Contatos ok. Buscando deals...`)

        if (body.syncDeals) {
          const deals = await fetchAllPages('/crm/v3/objects/deals', {
            properties: 'dealname,amount,closedate,dealstage,pipeline,createdate,mrr',
            associations: 'contacts',
          })
          await setProgress(85, `${deals.length} deals encontrados. Atualizando receita...`)
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
                where: and(eq(leads.tenantId, request.user.tid), eq(leads.crmIntegrationId, id), eq(leads.externalId, contactId)),
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
          app.log.info({ integrationId: id, dealsUpdated }, 'HubSpot deals synced')
        }

        await db.update(crmIntegrations).set({
          lastSyncAt: new Date(),
          syncStatus: 'done',
          syncProgress: 100,
          syncMessage: `✓ ${contacts.length} contatos sincronizados`,
          updatedAt: new Date(),
        }).where(eq(crmIntegrations.id, id))
        app.log.info({ integrationId: id }, 'HubSpot sync completed')
      } catch (e: any) {
        app.log.error({ integrationId: id, err: e.message }, 'HubSpot sync error')
        await db.update(crmIntegrations).set({
          syncStatus: 'error',
          syncProgress: 0,
          syncMessage: e.message ?? 'Erro no sync',
          updatedAt: new Date(),
        }).where(eq(crmIntegrations.id, id))
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
