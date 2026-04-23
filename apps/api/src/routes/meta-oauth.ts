import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, adsPlatformIntegrations, budgets } from '@ads/db'
import { env } from '../config/env.js'

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0'
const META_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth'
const SCOPES = ['ads_read', 'ads_management', 'read_insights'].join(',')

// Frontend URL derived from CORS_ORIGIN env
function frontendUrl() {
  return env.CORS_ORIGIN?.startsWith('http') ? env.CORS_ORIGIN : `https://${env.CORS_ORIGIN ?? 'ads.orffia.com'}`
}

function buildOAuthUrl(state: string) {
  const url = new URL(META_AUTH_URL)
  url.searchParams.set('client_id', env.META_APP_ID!)
  url.searchParams.set('redirect_uri', env.META_REDIRECT_URI ?? '')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  return url.toString()
}

export async function metaOAuthRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/auth/meta — inicia OAuth, redireciona para Facebook (browser redirect)
  app.get('/meta', { config: { skipAuth: false } }, async (request, reply) => {
    if (!env.META_APP_ID) {
      return reply.status(503).send({ error: 'META_NOT_CONFIGURED', message: 'Meta integration not configured' })
    }
    const state = Buffer.from(JSON.stringify({
      tid: request.user.tid,
      uid: request.user.sub,
    })).toString('base64url')
    return reply.redirect(buildOAuthUrl(state))
  })

  // GET /api/v1/auth/meta/url — retorna URL como JSON (frontend faz fetch autenticado, depois redireciona)
  app.get('/meta/url', { config: { skipAuth: false } }, async (request, reply) => {
    if (!env.META_APP_ID) {
      return reply.status(503).send({ error: 'META_NOT_CONFIGURED', message: 'Meta integration not configured' })
    }
    if (!request.user?.tid || !request.user?.sub) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing user context' })
    }
    const state = Buffer.from(JSON.stringify({
      tid: request.user.tid,
      uid: request.user.sub,
    })).toString('base64url')
    // Bug fix: wrap in { data: } to match API convention
    return reply.send({ data: { url: buildOAuthUrl(state) } })
  })

  // GET /api/v1/auth/meta/callback — Meta redireciona aqui após autorização (skipAuth!)
  app.get('/meta/callback', { config: { skipAuth: true } }, async (request, reply) => {
    const { code, state, error } = request.query as Record<string, string>
    const base = frontendUrl()

    if (error) {
      return reply.redirect(`${base}/integrations?error=meta_denied`)
    }
    if (!code || !state) {
      return reply.status(400).send({ error: 'INVALID_CALLBACK', message: 'Missing code or state' })
    }

    let tenantId: string
    let userId: string
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
      tenantId = decoded.tid
      userId = decoded.uid
      if (!tenantId || !userId) throw new Error('missing fields')
    } catch {
      return reply.status(400).send({ error: 'INVALID_STATE', message: 'Invalid state parameter' })
    }

    // Exchange code → short-lived token
    const tokenRes = await fetch(`${META_GRAPH_URL}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.META_APP_ID,
        client_secret: env.META_APP_SECRET,
        redirect_uri: env.META_REDIRECT_URI,
        code,
      }),
    })
    if (!tokenRes.ok) {
      const err = await tokenRes.json()
      app.log.error({ err }, 'Meta token exchange failed')
      return reply.redirect(`${base}/integrations?error=meta_token_failed`)
    }
    const tokenData = await tokenRes.json() as { access_token: string; expires_in?: number }
    const shortToken = tokenData.access_token

    // Exchange short → long-lived token (~60 days)
    const longUrl = new URL(`${META_GRAPH_URL}/oauth/access_token`)
    longUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longUrl.searchParams.set('client_id', env.META_APP_ID!)
    longUrl.searchParams.set('client_secret', env.META_APP_SECRET!)
    longUrl.searchParams.set('fb_exchange_token', shortToken)
    const longTokenRes = await fetch(longUrl.toString())
    const longTokenData = await longTokenRes.json() as { access_token: string; expires_in?: number }
    const accessToken = longTokenData.access_token ?? shortToken
    const expiresAt = new Date(Date.now() + (longTokenData.expires_in ?? 5184000) * 1000)

    // Fetch all ad accounts (paginated — Meta returns max 25 per page)
    type AdAccount = { id: string; name: string; account_status: number; currency: string }
    const adAccounts: AdAccount[] = []
    let nextUrl: string | null = (() => {
      const u = new URL(`${META_GRAPH_URL}/me/adaccounts`)
      u.searchParams.set('fields', 'id,name,account_status,currency')
      u.searchParams.set('limit', '100')
      u.searchParams.set('access_token', accessToken)
      return u.toString()
    })()

    while (nextUrl) {
      const res = await fetch(nextUrl)
      if (!res.ok) {
        app.log.error({ status: res.status }, 'Failed to fetch Meta ad accounts')
        return reply.redirect(`${base}/integrations?error=meta_token_failed`)
      }
      const page = await res.json() as {
        data: AdAccount[]
        paging?: { next?: string }
      }
      adAccounts.push(...(page.data ?? []))
      nextUrl = page.paging?.next ?? null
    }

    const created: string[] = []
    for (const account of adAccounts) {
      const existing = await db.query.adsPlatformIntegrations.findFirst({
        where: and(
          eq(adsPlatformIntegrations.tenantId, tenantId),
          eq(adsPlatformIntegrations.accountId, account.id)
        ),
      })
      if (existing) {
        await db.update(adsPlatformIntegrations)
          .set({ credentials: { accessToken, expiresAt: expiresAt.toISOString() }, status: 'pending', updatedAt: new Date() })
          .where(eq(adsPlatformIntegrations.id, existing.id))
        created.push(existing.id)
      } else {
        const [integration] = await db.insert(adsPlatformIntegrations).values({
          tenantId,
          platform: 'meta',
          name: account.name,
          accountId: account.id,
          credentials: { accessToken, expiresAt: expiresAt.toISOString() },
          status: 'pending',
          meta: { currency: account.currency },
        }).returning()
        if (integration) created.push(integration.id)
      }
    }

    app.log.info({ tenantId, accountsFound: adAccounts.length }, 'Meta OAuth completed')
    return reply.redirect(`${base}/integrations?meta_select=${created.length}`)
  })

  // GET /api/v1/auth/meta/sync/:integrationId
  app.get('/meta/sync/:integrationId', { config: { skipAuth: false } }, async (request, reply) => {
    const { integrationId } = request.params as { integrationId: string }

    const integration = await db.query.adsPlatformIntegrations.findFirst({
      where: and(
        eq(adsPlatformIntegrations.id, integrationId),
        eq(adsPlatformIntegrations.tenantId, request.user.tid)
      ),
    })
    if (!integration || integration.platform !== 'meta') {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Integration not found' })
    }

    const creds = integration.credentials as { accessToken?: string; expiresAt?: string }
    if (!creds.accessToken) {
      return reply.status(400).send({ error: 'NO_TOKEN', message: 'No access token — reconnect Meta' })
    }
    if (creds.expiresAt && new Date() > new Date(creds.expiresAt)) {
      return reply.status(401).send({ error: 'TOKEN_EXPIRED', message: 'Access token expired — reconnect Meta' })
    }

    const now = new Date()
    const sinceDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const untilDate = now.toISOString().split('T')[0]

    // Build URL properly to avoid encoding issues
    const insightsUrl = new URL(`${META_GRAPH_URL}/${integration.accountId}/insights`)
    insightsUrl.searchParams.set('fields', 'spend,impressions,clicks,actions')
    insightsUrl.searchParams.set('time_range', JSON.stringify({ since: sinceDate, until: untilDate }))
    insightsUrl.searchParams.set('access_token', creds.accessToken)

    const insightsRes = await fetch(insightsUrl.toString())
    if (!insightsRes.ok) {
      const err = await insightsRes.json().catch(() => ({}))
      app.log.error({ err, integrationId }, 'Meta insights fetch failed')
      return reply.status(502).send({ error: 'INSIGHTS_FAILED', message: 'Failed to fetch insights from Meta' })
    }

    const insightsData = await insightsRes.json() as { data: { spend: string; actions?: { action_type: string; value: string }[] }[] }
    const insights = insightsData.data?.[0]
    const spend = parseFloat(insights?.spend ?? '0')
    const leads = (insights?.actions?.filter((a) => a.action_type === 'lead') ?? [])
      .reduce((sum, a) => sum + parseInt(a.value ?? '0'), 0)

    await db.update(adsPlatformIntegrations)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(adsPlatformIntegrations.id, integrationId))

    // Update budget spentAmount for this integration/month
    const now2 = new Date()
    const budgetRow = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.tenantId, request.user.tid),
        eq(budgets.integrationId, integrationId),
        eq(budgets.month, now2.getMonth() + 1),
        eq(budgets.year, now2.getFullYear()),
      ),
    })
    if (budgetRow) {
      await db.update(budgets)
        .set({ spentAmount: spend.toString(), updatedAt: new Date() })
        .where(eq(budgets.id, budgetRow.id))
    }

    return reply.send({
      data: {
        accountId: integration.accountId,
        name: integration.name,
        period: `${sinceDate} - ${untilDate}`,
        spend,
        leads,
        budgetUpdated: !!budgetRow,
      }
    })
  })

  // GET /api/v1/auth/meta/campaigns/:integrationId
  app.get('/meta/campaigns/:integrationId', { config: { skipAuth: false } }, async (request, reply) => {
    const { integrationId } = request.params as { integrationId: string }
    const { since, until } = request.query as { since?: string; until?: string }

    const integration = await db.query.adsPlatformIntegrations.findFirst({
      where: and(
        eq(adsPlatformIntegrations.id, integrationId),
        eq(adsPlatformIntegrations.tenantId, request.user.tid)
      ),
    })
    if (!integration || integration.platform !== 'meta') {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Integration not found' })
    }

    const creds = integration.credentials as { accessToken?: string; expiresAt?: string }
    if (!creds.accessToken) {
      return reply.status(400).send({ error: 'NO_TOKEN', message: 'No access token — reconnect Meta' })
    }

    const dateFrom = since ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const dateTo = until ?? new Date().toISOString().split('T')[0]

    const campaignsUrl = new URL(`${META_GRAPH_URL}/${integration.accountId}/campaigns`)
    campaignsUrl.searchParams.set(
      'fields',
      `id,name,status,insights.time_range(${JSON.stringify({ since: dateFrom, until: dateTo })}){spend,impressions,clicks,actions}`
    )
    campaignsUrl.searchParams.set('access_token', creds.accessToken)

    const campaignsRes = await fetch(campaignsUrl.toString())
    if (!campaignsRes.ok) {
      return reply.status(502).send({ error: 'CAMPAIGNS_FAILED', message: 'Failed to fetch campaigns from Meta' })
    }

    const campaignsData = await campaignsRes.json() as {
      data: {
        id: string
        name: string
        status: string
        insights?: { data: { spend: string; actions?: { action_type: string; value: string }[] }[] }
      }[]
    }

    const campaigns = (campaignsData.data ?? []).map((c) => {
      const insight = c.insights?.data?.[0]
      const spend = parseFloat(insight?.spend ?? '0')
      const leads = (insight?.actions?.filter((a) => a.action_type === 'lead') ?? [])
        .reduce((sum, a) => sum + parseInt(a.value ?? '0'), 0)
      const cpl = leads > 0 ? spend / leads : 0
      return { id: c.id, name: c.name, status: c.status, spend, leads, cpl: Math.round(cpl * 100) / 100 }
    })

    return reply.send({ data: campaigns })
  })
}
