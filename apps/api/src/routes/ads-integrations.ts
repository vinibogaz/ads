import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, adsPlatformIntegrations, crmIntegrations } from '@ads/db'
import { z } from 'zod'

const createAdsPlatformSchema = z.object({
  platform: z.enum(['meta', 'google', 'linkedin', 'tiktok', 'twitter', 'pinterest', 'taboola', 'other']),
  name: z.string().min(1).max(255),
  accountId: z.string().max(255).optional(),
  credentials: z.record(z.unknown()).optional().default({}),
  meta: z.record(z.unknown()).optional().default({}),
})

const createCrmSchema = z.object({
  platform: z.enum(['rd_station', 'hubspot', 'pipedrive', 'nectar', 'moskit', 'salesforce', 'zoho', 'webhook', 'other']),
  name: z.string().min(1).max(255),
  credentials: z.record(z.unknown()).optional().default({}),
  funnelMapping: z.record(z.string()).optional().default({}),
  meta: z.record(z.unknown()).optional().default({}),
})

export async function adsIntegrationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // ── Ads Platforms ────────────────────────────────────────────────────────────

  // GET /api/v1/ads-integrations/platforms
  app.get('/platforms', async (request, reply) => {
    const rows = await db.query.adsPlatformIntegrations.findMany({
      where: eq(adsPlatformIntegrations.tenantId, request.user.tid),
      orderBy: (p, { asc }) => [asc(p.platform)],
    })
    return reply.send({ data: rows.map((r) => ({ ...r, credentials: undefined })) })
  })

  // POST /api/v1/ads-integrations/platforms
  app.post('/platforms', async (request, reply) => {
    const body = createAdsPlatformSchema.parse(request.body)

    const [integration] = await db
      .insert(adsPlatformIntegrations)
      .values({ tenantId: request.user.tid, ...body })
      .returning()

    return reply.status(201).send({ data: { ...integration, credentials: undefined } })
  })

  // PATCH /api/v1/ads-integrations/platforms/:id
  app.patch('/platforms/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createAdsPlatformSchema.partial().parse(request.body)

    const existing = await db.query.adsPlatformIntegrations.findFirst({
      where: and(
        eq(adsPlatformIntegrations.id, id),
        eq(adsPlatformIntegrations.tenantId, request.user.tid)
      ),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Integration not found', statusCode: 404 })
    }

    const [updated] = await db
      .update(adsPlatformIntegrations)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(adsPlatformIntegrations.id, id))
      .returning()

    return reply.send({ data: { ...updated, credentials: undefined } })
  })

  // DELETE /api/v1/ads-integrations/platforms/:id
  app.delete('/platforms/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await db.query.adsPlatformIntegrations.findFirst({
      where: and(
        eq(adsPlatformIntegrations.id, id),
        eq(adsPlatformIntegrations.tenantId, request.user.tid)
      ),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Integration not found', statusCode: 404 })
    }

    await db.delete(adsPlatformIntegrations).where(eq(adsPlatformIntegrations.id, id))
    return reply.status(204).send()
  })

  // ── CRM Integrations ──────────────────────────────────────────────────────────

  // GET /api/v1/ads-integrations/crm
  app.get('/crm', async (request, reply) => {
    const rows = await db.query.crmIntegrations.findMany({
      where: eq(crmIntegrations.tenantId, request.user.tid),
      orderBy: (c, { asc }) => [asc(c.platform)],
    })
    return reply.send({ data: rows.map((r) => ({ ...r, credentials: undefined })) })
  })

  // POST /api/v1/ads-integrations/crm
  app.post('/crm', async (request, reply) => {
    const body = createCrmSchema.parse(request.body)

    const [integration] = await db
      .insert(crmIntegrations)
      .values({ tenantId: request.user.tid, ...body })
      .returning()

    return reply.status(201).send({ data: { ...integration, credentials: undefined } })
  })

  // PATCH /api/v1/ads-integrations/crm/:id
  app.patch('/crm/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createCrmSchema.partial().parse(request.body)

    const existing = await db.query.crmIntegrations.findFirst({
      where: and(eq(crmIntegrations.id, id), eq(crmIntegrations.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'CRM integration not found', statusCode: 404 })
    }

    const [updated] = await db
      .update(crmIntegrations)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(crmIntegrations.id, id))
      .returning()

    return reply.send({ data: { ...updated, credentials: undefined } })
  })

  // DELETE /api/v1/ads-integrations/crm/:id
  app.delete('/crm/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await db.query.crmIntegrations.findFirst({
      where: and(eq(crmIntegrations.id, id), eq(crmIntegrations.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'CRM integration not found', statusCode: 404 })
    }

    await db.delete(crmIntegrations).where(eq(crmIntegrations.id, id))
    return reply.status(204).send()
  })
}
