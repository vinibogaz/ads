/**
 * CRM Sync Scheduler
 * Runs automatically in background, syncing HubSpot integrations hourly.
 *
 * Interval controlled by SYNC_INTERVAL_HOURS env var (default: 1).
 * Future: per-tenant intervals based on plan (1h, 6h, 12h, 24h).
 */
import { eq } from 'drizzle-orm'
import { db, crmIntegrations } from '@ads/db'
import { runHubSpotContactSync } from './hubspot-sync.js'
import type { FastifyBaseLogger } from 'fastify'

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
const DEFAULT_SYNC_INTERVAL_HOURS = parseInt(process.env['SYNC_INTERVAL_HOURS'] ?? '1')

const HS_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token'
const HS_API = 'https://api.hubapi.com'

let schedulerTimer: ReturnType<typeof setInterval> | null = null

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getValidToken(integration: any): Promise<string> {
  const creds = integration.credentials as any
  if (creds.tokenType === 'private_app' && creds.accessToken) return creds.accessToken

  const isExpired = !creds.tokenExpiry || Date.now() > creds.tokenExpiry
  if (!isExpired && creds.accessToken) return creds.accessToken

  if (!creds.refreshToken) throw new Error('no refresh token')

  const res = await fetch(HS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env['HUBSPOT_CLIENT_ID']!,
      client_secret: process.env['HUBSPOT_CLIENT_SECRET']!,
      refresh_token: creds.refreshToken,
    }),
  })
  if (!res.ok) throw new Error('token refresh failed')
  const data = await res.json() as any
  await db.update(crmIntegrations).set({
    credentials: { ...creds, accessToken: data.access_token, refreshToken: data.refresh_token, tokenExpiry: Date.now() + (data.expires_in - 60) * 1000 },
    updatedAt: new Date(),
  }).where(eq(crmIntegrations.id, integration.id))
  return data.access_token
}

async function fetchAllContacts(token: string): Promise<any[]> {
  const all: any[] = []
  let after: string | undefined = undefined
  do {
    const url = new URL(`${HS_API}/crm/v3/objects/contacts`)
    url.searchParams.set('limit', '100')
    url.searchParams.set('properties', 'firstname,lastname,email,phone,company,hs_lifecycle_stage,hs_analytics_source')
    if (after) url.searchParams.set('after', after)

    let retries = 3
    let data: any
    while (retries > 0) {
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 429 && retries > 1) { await sleep(3000); retries--; continue }
      if (!res.ok) throw new Error(`HubSpot API ${res.status}`)
      data = await res.json()
      break
    }
    all.push(...(data.results ?? []))
    after = data.paging?.next?.after
    if (after) await sleep(300)
  } while (after)
  return all
}

async function syncIntegration(integration: any, logger: FastifyBaseLogger) {
  try {
    const token = await getValidToken(integration)
    const contacts = await fetchAllContacts(token)
    const result = await runHubSpotContactSync(integration.tenantId, integration.id, contacts)
    await db.update(crmIntegrations).set({ lastSyncAt: new Date(), updatedAt: new Date() }).where(eq(crmIntegrations.id, integration.id))
    logger.info({ integrationId: integration.id, ...result }, 'Scheduled HubSpot sync completed')
  } catch (e: any) {
    logger.warn({ integrationId: integration.id, err: e.message }, 'Scheduled HubSpot sync failed')
  }
}

async function runScheduledSyncs(logger: FastifyBaseLogger) {
  const cutoff = new Date(Date.now() - DEFAULT_SYNC_INTERVAL_HOURS * 60 * 60 * 1000)

  const all = await db.query.crmIntegrations.findMany({
    where: eq(crmIntegrations.platform, 'hubspot'),
  })

  const due = all.filter(
    (i) => i.status === 'active' && (!i.lastSyncAt || new Date(i.lastSyncAt) < cutoff)
  )

  if (due.length === 0) return
  logger.info({ count: due.length }, 'Running scheduled HubSpot syncs')
  for (const integration of due) {
    await syncIntegration(integration, logger)
  }
}

export function startCrmSyncScheduler(logger: FastifyBaseLogger) {
  if (schedulerTimer) return
  logger.info({ intervalHours: DEFAULT_SYNC_INTERVAL_HOURS }, 'CRM sync scheduler started')
  schedulerTimer = setInterval(() => {
    runScheduledSyncs(logger).catch((e) =>
      logger.error({ err: e.message }, 'CRM sync scheduler error')
    )
  }, CHECK_INTERVAL_MS)
}

export function stopCrmSyncScheduler() {
  if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null }
}
