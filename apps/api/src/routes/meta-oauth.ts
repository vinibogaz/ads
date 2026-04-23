import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, adsPlatformIntegrations } from '@ads/db'
import { env } from '../config/env.js'

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0'
const META_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth'
const SCOPES = ['ads_read', 'ads_management', 'read_insights'].join(',')

export async function metaOAuthRoutes(app: FastifyInstance) {

  // GET /api/v1/auth/meta — inicia OAuth, redireciona para Facebook
  app.get('/meta', { config: { skipAuth: false } }, async (request, reply) => {
    if (!env.META_APP_ID) {
      return reply.status(503).send({ error: 'META_NOT_CONFIGURED', message: 'Meta integration not configured' })
    }

    // State: encode tenantId to recover after callback
    const state = Buffer.from(JSON.stringify({
      tid: request.user.tid,
      uid: request.user.sub,
    })).toString('base64url')

    const url = new URL(META_AUTH_URL)
    url.searchParams.set('client_id', env.META_APP_ID)
    url.searchParams.set('redirect_uri', env.META_REDIRECT_URI ?? '')
    url.searchParams.set('scope', SCOPES)
    url.searchParams.set('state', state)
    url.searchParams.set('response_type', 'code')

    return reply.redirect(url.toString())
  })

  // GET /api/v1/auth/meta/url — retorna a URL de autorização sem redirecionar (para uso via fetch no frontend)
  app.get('/meta/url', { config: { skipAuth: false } }, async (request, reply) => {
    if (!env.META_APP_ID) {
      return reply.status(503).send({ error: 'META_NOT_CONFIGURED', message: 'Meta integration not configured' })
    }

    const state = Buffer.from(JSON.stringify({
      tid: request.user.tid,
      uid: request.user.sub,
    })).toString('base64url')

    const url = new URL(META_AUTH_URL)
    url.searchParams.set('client_id', env.META_APP_ID)
    url.searchParams.set('redirect_uri', env.META_REDIRECT_URI ?? '')
    url.searchParams.set('scope', SCOPES)
    url.searchParams.set('state', state)
    url.searchParams.set('response_type', 'code')

    return reply.send({ url: url.toString() })
  })

  // GET /api/v1/auth/meta/callback — Meta redireciona aqui após autorização
  app.get('/meta/callback', { config: { skipAuth: true } }, async (request, reply) => {
    const { code, state, error } = request.query as Record<string, string>

    if (error) {
      return reply.redirect(`https://${process.env['CORS_ORIGIN']?.replace(/https?:\/\//, '') ?? 'ads.orffia.com'}/integrations?error=meta_denied`)
    }

    if (!code || !state) {
      return reply.status(400).send({ error: 'INVALID_CALLBACK', message: 'Missing code or state' })
    }

    // Decode state
    let tenantId: string
    let userId: string
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
      tenantId = decoded.tid
      userId = decoded.uid
    } catch {
      return reply.status(400).send({ error: 'INVALID_STATE', message: 'Invalid state parameter' })
    }

    // Exchange code for access token
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
      const err = await tokenRes.json() as any
      app.log.error({ err }, 'Meta token exchange failed')
      return reply.redirect('https://ads.orffia.com/integrations?error=meta_token_failed')
    }

    const tokenData = await tokenRes.json() as { access_token: string; token_type: string; expires_in?: number }
    const shortToken = tokenData.access_token

    // Exchange for long-lived token (60 days)
    const longTokenRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${env.META_APP_ID}&client_secret=${env.META_APP_SECRET}&fb_exchange_token=${shortToken}`
    )
    const longTokenData = await longTokenRes.json() as { access_token: string; expires_in?: number }
    const accessToken = longTokenData.access_token ?? shortToken

    // Fetch user's ad accounts
    const accountsRes = await fetch(
      `${META_GRAPH_URL}/me/adaccounts?fields=id,name,account_status,currency&access_token=${accessToken}`
    )
    const accountsData = await accountsRes.json() as { data: { id: string; name: string; account_status: number; currency: string }[] }
    const adAccounts = accountsData.data ?? []

    // Create integration records for each ad account
    const created = []
    for (const account of adAccounts) {
      // Check if already exists
      const existing = await db.query.adsPlatformIntegrations.findFirst({
        where: and(
          eq(adsPlatformIntegrations.tenantId, tenantId),
          eq(adsPlatformIntegrations.accountId, account.id)
        ),
      })

      if (existing) {
        // Update token
        await db.update(adsPlatformIntegrations)
          .set({
            credentials: { accessToken },
            status: account.account_status === 1 ? 'active' : 'inactive',
            updatedAt: new Date(),
          })
          .where(eq(adsPlatformIntegrations.id, existing.id))
        created.push(existing.id)
      } else {
        const [integration] = await db.insert(adsPlatformIntegrations).values({
          tenantId,
          platform: 'meta',
          name: account.name,
          accountId: account.id,
          credentials: { accessToken },
          status: account.account_status === 1 ? 'active' : 'inactive',
          meta: { currency: account.currency },
        }).returning()
        if (integration) created.push(integration.id)
      }
    }

    app.log.info({ tenantId, accountsFound: adAccounts.length }, 'Meta OAuth completed')

    // Redirect back to integrations page with success
    return reply.redirect(`https://ads.orffia.com/integrations?meta_connected=${created.length}`)
  })

  // GET /api/v1/auth/meta/sync/:integrationId — sincroniza dados de uma conta
  app.get('/meta/sync/:integrationId', async (request, reply) => {
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

    const creds = integration.credentials as { accessToken?: string }
    if (!creds.accessToken) {
      return reply.status(400).send({ error: 'NO_TOKEN', message: 'No access token — reconnect Meta' })
    }

    const now = new Date()
    const since = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000)
    const until = Math.floor(now.getTime() / 1000)

    // Fetch account insights (spend)
    const insightsRes = await fetch(
      `${META_GRAPH_URL}/${integration.accountId}/insights?fields=spend,impressions,clicks,actions&time_range={"since":"${new Date(since * 1000).toISOString().split('T')[0]}","until":"${new Date(until * 1000).toISOString().split('T')[0]}"}&access_token=${creds.accessToken}`
    )
    const insightsData = await insightsRes.json() as { data: { spend: string; actions?: { action_type: string; value: string }[] }[] }
    const insights = insightsData.data?.[0]

    const spend = parseFloat(insights?.spend ?? '0')
    const leadActions = insights?.actions?.filter((a) => a.action_type === 'lead') ?? []
    const leads = leadActions.reduce((sum, a) => sum + parseInt(a.value ?? '0'), 0)

    // Update spent_amount on budget if exists
    await db.update(adsPlatformIntegrations)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(adsPlatformIntegrations.id, integrationId))

    return reply.send({
      data: {
        accountId: integration.accountId,
        name: integration.name,
        period: `${new Date(since * 1000).toLocaleDateString('pt-BR')} - ${new Date(until * 1000).toLocaleDateString('pt-BR')}`,
        spend,
        leads,
      }
    })
  })

  // GET /api/v1/auth/meta/campaigns/:integrationId — lista campanhas com métricas
  app.get('/meta/campaigns/:integrationId', async (request, reply) => {
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

    const creds = integration.credentials as { accessToken?: string }
    if (!creds.accessToken) {
      return reply.status(400).send({ error: 'NO_TOKEN', message: 'No access token — reconnect Meta' })
    }

    const dateFrom = since ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const dateTo = until ?? new Date().toISOString().split('T')[0]

    const campaignsRes = await fetch(
      `${META_GRAPH_URL}/${integration.accountId}/campaigns?fields=id,name,status,insights.time_range({"since":"${dateFrom}","until":"${dateTo}"}){spend,impressions,clicks,actions}&access_token=${creds.accessToken}`
    )
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
      const leadActions = insight?.actions?.filter((a) => a.action_type === 'lead') ?? []
      const leads = leadActions.reduce((sum, a) => sum + parseInt(a.value ?? '0'), 0)
      const cpl = leads > 0 ? spend / leads : 0

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        spend,
        leads,
        cpl: Math.round(cpl * 100) / 100,
      }
    })

    return reply.send({ data: campaigns })
  })
}
