/**
 * Shared HubSpot contact sync logic — used by both the manual sync endpoint
 * and the automated CRM sync scheduler.
 *
 * Key constraints:
 * - PostgreSQL / Drizzle limit: max 65 534 parameters per query
 * - inArray() chunks: 1 000 items → safe for any portal size
 * - Inserts: batched at 500 rows → avoids parameter explosion
 * - Updates: one per row (different values per row, no bulk trick needed)
 */
import { eq, and, inArray } from 'drizzle-orm'
import { db, leads } from '@ads/db'

// ─── helpers ────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

// ─── domain maps ────────────────────────────────────────────────────────────

const STATUS_RANK: Record<string, number> = {
  new: 0, no_contact: 1, contacted: 2, qualified: 3,
  unqualified: 3, opportunity: 4, won: 5, lost: 5,
}

function mapLifecycleStatus(lifecycle: string): string {
  switch (lifecycle) {
    case 'customer':               return 'won'
    case 'opportunity':            return 'opportunity'
    case 'salesqualifiedlead':
    case 'marketingqualifiedlead': return 'qualified'
    default:                       return 'new'
  }
}

function normalizePlatform(detail: string): string {
  if (!detail) return ''
  const d = detail.toLowerCase()
  if (d.includes('facebook') || d.includes('fb.com')) return 'facebook'
  if (d.includes('instagram'))                         return 'instagram'
  if (d.includes('google'))                            return 'google'
  if (d.includes('youtube'))                           return 'youtube'
  if (d.includes('linkedin'))                          return 'linkedin'
  if (d.includes('tiktok'))                            return 'tiktok'
  if (d.includes('twitter') || d.includes('x.com'))   return 'twitter'
  if (d.includes('whatsapp'))                          return 'whatsapp'
  return d.split('.')[0] ?? d
}

function mapHsSource(
  hsSource: string,
  detail1?: string,
  detail2?: string,
): { source: string | null; medium: string | null } {
  switch (hsSource) {
    case 'PAID_SEARCH':     return { source: normalizePlatform(detail1 ?? '') || 'google',   medium: 'cpc' }
    case 'PAID_SOCIAL':     return { source: normalizePlatform(detail1 ?? '') || 'facebook', medium: 'paid_social' }
    case 'ORGANIC_SEARCH':  return { source: normalizePlatform(detail1 ?? '') || 'google',   medium: 'organic' }
    case 'SOCIAL_MEDIA':    return { source: normalizePlatform(detail1 ?? '') || 'social',   medium: 'social' }
    case 'EMAIL_MARKETING': return { source: detail1 || 'email',                             medium: 'email' }
    case 'REFERRALS':       return { source: normalizePlatform(detail1 ?? '') || 'referral', medium: 'referral' }
    case 'DIRECT_TRAFFIC':  return { source: 'direct',                                       medium: '(none)' }
    case 'OTHER_CAMPAIGNS': return { source: detail1 || 'campaign',                          medium: detail2 || 'campaign' }
    case 'OFFLINE':         return { source: 'offline',                                      medium: 'offline' }
    default:                return { source: hsSource?.toLowerCase() || null,                medium: null }
  }
}

// ─── main export ────────────────────────────────────────────────────────────

export async function runHubSpotContactSync(
  tenantId: string,
  integrationId: string,
  contacts: any[],
  clientId?: string | null,
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  if (contacts.length === 0) return { created, updated }

  const externalIds = contacts.map((c: any) => String(c.id))
  const emails = contacts
    .map((c: any) => (c.properties?.email ?? '').toLowerCase().trim())
    .filter(Boolean)

  // ── 1. Fetch existing leads in chunks of 1 000 to stay under pg param limit ──
  const existingByExtId = new Map<string, any>()
  const existingByEmail  = new Map<string, any>()

  for (const ids of chunk(externalIds, 1_000)) {
    const rows = await db.query.leads.findMany({
      where: and(
        eq(leads.tenantId, tenantId),
        eq(leads.crmIntegrationId, integrationId),
        inArray(leads.externalId, ids),
      ),
    })
    rows.forEach((l) => l.externalId && existingByExtId.set(l.externalId, l))
  }

  if (emails.length > 0) {
    for (const em of chunk(emails, 1_000)) {
      const rows = await db.query.leads.findMany({
        where: and(eq(leads.tenantId, tenantId), inArray(leads.email, em)),
      })
      rows.forEach((l) => l.email && existingByEmail.set(l.email, l))
    }
  }

  // ── 2. Classify contacts into inserts vs updates ──────────────────────────
  const toInsert: (typeof leads.$inferInsert)[] = []
  const toUpdate: Array<{ id: string; values: Partial<typeof leads.$inferInsert> }> = []

  for (const contact of contacts) {
    const p           = contact.properties ?? {}
    const email       = (p.email ?? '').toLowerCase().trim()
    const name        = [p.firstname, p.lastname].filter(Boolean).join(' ') || null
    const externalId  = String(contact.id)
    const status      = mapLifecycleStatus(p.hs_lifecycle_stage ?? '')
    const existing    = existingByExtId.get(externalId) ?? (email ? existingByEmail.get(email) : null)
    const hsCreatedAt = p.createdate ? new Date(p.createdate) : null

    const { source: utmSource, medium: utmMedium } = mapHsSource(
      p.hs_analytics_source ?? '',
      p.hs_analytics_source_data_1,
      p.hs_analytics_source_data_2,
    )

    if (existing) {
      const keepStatus = (STATUS_RANK[existing.status] ?? 0) >= (STATUS_RANK[status] ?? 0)
      toUpdate.push({
        id: existing.id,
        values: {
          externalId,
          crmIntegrationId: integrationId,
          name:      name      || existing.name,
          email:     email     || existing.email,
          phone:     p.phone   || existing.phone,
          company:   p.company || existing.company,
          status:    keepStatus ? existing.status : (status as any),
          utmSource: utmSource || existing.utmSource,
          utmMedium: utmMedium || existing.utmMedium,
          ...(hsCreatedAt ? { createdAt: hsCreatedAt } : {}),
          updatedAt: new Date(),
        },
      })
    } else {
      toInsert.push({
        tenantId,
        clientId:         clientId ?? null,
        crmIntegrationId: integrationId,
        externalId,
        name,
        email:     email    || null,
        phone:     p.phone  || null,
        company:   p.company || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        status:    status as any,
        createdAt: hsCreatedAt ?? new Date(),
        meta: {
          hsLifecycleStage: p.hs_lifecycle_stage,
          hsSource:         p.hs_analytics_source,
          hsSourceDetail:   p.hs_analytics_source_data_1,
          firstUrl:         p.hs_analytics_first_url,
        },
      })
      // Register so duplicates within this batch are not double-inserted
      existingByExtId.set(externalId, { externalId, email })
      if (email) existingByEmail.set(email, { externalId, email })
    }
  }

  // ── 3. Batch inserts — 500 rows each (13 columns × 500 = 6 500 params, well under 65 534) ──
  const INSERT_CHUNK = 500
  for (const batch of chunk(toInsert, INSERT_CHUNK)) {
    await db.insert(leads).values(batch).onConflictDoNothing()
    created += batch.length
  }

  // ── 4. Updates — still one per row (each row has different values) ─────────
  for (const { id, values } of toUpdate) {
    await db.update(leads).set(values).where(eq(leads.id, id))
    updated++
  }

  return { created, updated }
}
