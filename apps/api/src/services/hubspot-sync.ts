/**
 * Shared HubSpot contact sync logic — used by both the manual sync endpoint
 * and the automated CRM sync scheduler.
 */
import { eq, and, inArray } from 'drizzle-orm'
import { db, leads } from '@ads/db'

const STATUS_RANK: Record<string, number> = {
  new: 0, no_contact: 1, contacted: 2, qualified: 3,
  unqualified: 3, opportunity: 4, won: 5, lost: 5,
}

function mapLifecycleStatus(lifecycle: string): string {
  switch (lifecycle) {
    case 'customer': return 'won'
    case 'opportunity': return 'opportunity'
    case 'salesqualifiedlead':
    case 'marketingqualifiedlead': return 'qualified'
    default: return 'new'
  }
}

export async function runHubSpotContactSync(
  tenantId: string,
  integrationId: string,
  contacts: any[],
  clientId?: string | null
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  const externalIds = contacts.map((c: any) => String(c.id))
  const emails = contacts
    .map((c: any) => (c.properties?.email ?? '').toLowerCase().trim())
    .filter(Boolean)

  const existingByExtId = new Map<string, any>()
  const existingByEmail = new Map<string, any>()

  if (externalIds.length > 0) {
    const byExtId = await db.query.leads.findMany({
      where: and(
        eq(leads.tenantId, tenantId),
        eq(leads.crmIntegrationId, integrationId),
        inArray(leads.externalId, externalIds)
      ),
    })
    byExtId.forEach((l) => l.externalId && existingByExtId.set(l.externalId, l))
  }

  if (emails.length > 0) {
    const byEmail = await db.query.leads.findMany({
      where: and(eq(leads.tenantId, tenantId), inArray(leads.email, emails)),
    })
    byEmail.forEach((l) => l.email && existingByEmail.set(l.email, l))
  }

  for (const contact of contacts) {
    const p = contact.properties ?? {}
    const email = (p.email ?? '').toLowerCase().trim()
    const name = [p.firstname, p.lastname].filter(Boolean).join(' ') || null
    const externalId = String(contact.id)
    const status = mapLifecycleStatus(p.hs_lifecycle_stage ?? '')

    const existing = existingByExtId.get(externalId) ?? (email ? existingByEmail.get(email) : null)

    if (existing) {
      const keepStatus = (STATUS_RANK[existing.status] ?? 0) >= (STATUS_RANK[status] ?? 0)
      await db.update(leads).set({
        externalId,
        crmIntegrationId: integrationId,
        name: name || existing.name,
        email: email || existing.email,
        phone: p.phone || existing.phone,
        company: p.company || existing.company,
        status: keepStatus ? existing.status : (status as any),
        utmSource: p.hs_analytics_source || existing.utmSource,
        updatedAt: new Date(),
      }).where(eq(leads.id, existing.id))
      updated++
    } else {
      await db.insert(leads).values({
        tenantId,
        clientId: clientId ?? null,
        crmIntegrationId: integrationId,
        externalId,
        name,
        email: email || null,
        phone: p.phone || null,
        company: p.company || null,
        utmSource: p.hs_analytics_source || null,
        status: status as any,
        meta: { hsLifecycleStage: p.hs_lifecycle_stage, hsSource: p.hs_analytics_source },
      })
      created++
      existingByExtId.set(externalId, { externalId, email })
      if (email) existingByEmail.set(email, { externalId, email })
    }
  }

  return { created, updated }
}
