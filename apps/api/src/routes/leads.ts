import type { FastifyInstance } from 'fastify'
import { eq, and, desc } from 'drizzle-orm'
import { db, leads, funnelStages, offlineConversions } from '@ads/db'
import { z } from 'zod'

const createLeadSchema = z.object({
  crmIntegrationId: z.string().uuid().optional(),
  externalId: z.string().max(255).optional(),
  stageId: z.string().uuid().optional(),
  status: z.enum(['new', 'no_contact', 'contacted', 'qualified', 'unqualified', 'opportunity', 'won', 'lost']).optional(),
  name: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  gclid: z.string().max(255).optional(),
  fbclid: z.string().max(255).optional(),
  meta: z.record(z.unknown()).optional().default({}),
})

const updateLeadSchema = createLeadSchema.partial()

const sendConversionSchema = z.object({
  integrationId: z.string().uuid(),
  event: z.enum(['lead', 'qualified_lead', 'opportunity', 'sale', 'custom']),
  value: z.number().positive().optional(),
  currency: z.string().length(3).optional().default('BRL'),
})

export async function leadsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/leads
  app.get('/', async (request, reply) => {
    const query = request.query as { status?: string; stageId?: string; page?: string; perPage?: string }
    const page = parseInt(query.page ?? '1')
    const perPage = Math.min(parseInt(query.perPage ?? '50'), 100)
    const offset = (page - 1) * perPage

    const conditions = [eq(leads.tenantId, request.user.tid)]
    if (query.status) conditions.push(eq(leads.status, query.status as any))
    if (query.stageId) conditions.push(eq(leads.stageId, query.stageId))

    const rows = await db.query.leads.findMany({
      where: and(...conditions),
      with: { stage: true },
      orderBy: (l, { desc }) => [desc(l.createdAt)],
      limit: perPage,
      offset,
    })

    return reply.send({ data: rows, meta: { page, perPage } })
  })

  // GET /api/v1/leads/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const lead = await db.query.leads.findFirst({
      where: and(eq(leads.id, id), eq(leads.tenantId, request.user.tid)),
      with: { stage: true, offlineConversions: true },
    })

    if (!lead) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Lead not found', statusCode: 404 })
    }

    return reply.send({ data: lead })
  })

  // POST /api/v1/leads
  app.post('/', async (request, reply) => {
    const body = createLeadSchema.parse(request.body)

    const [lead] = await db
      .insert(leads)
      .values({ tenantId: request.user.tid, ...body })
      .returning()

    return reply.status(201).send({ data: lead })
  })

  // PATCH /api/v1/leads/:id
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateLeadSchema.parse(request.body)

    const existing = await db.query.leads.findFirst({
      where: and(eq(leads.id, id), eq(leads.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Lead not found', statusCode: 404 })
    }

    const [updated] = await db
      .update(leads)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning()

    return reply.send({ data: updated })
  })

  // POST /api/v1/leads/:id/convert — envia conversão offline para plataforma de ads
  app.post('/:id/convert', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = sendConversionSchema.parse(request.body)

    const lead = await db.query.leads.findFirst({
      where: and(eq(leads.id, id), eq(leads.tenantId, request.user.tid)),
    })

    if (!lead) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Lead not found', statusCode: 404 })
    }

    const integration = await db.query.adsPlatformIntegrations.findFirst({
      where: and(
        eq(db.query.adsPlatformIntegrations as any, body.integrationId),
        eq(db.query.adsPlatformIntegrations as any, request.user.tid)
      ),
    })

    const [conversion] = await db
      .insert(offlineConversions)
      .values({
        tenantId: request.user.tid,
        leadId: id,
        integrationId: body.integrationId,
        platform: integration?.platform ?? 'other',
        event: body.event,
        value: body.value?.toString(),
        currency: body.currency,
        status: 'pending',
      })
      .returning()

    // TODO: dispatch to platform-specific conversion service (Meta CAPI, Google Enhanced Conversions)
    // For now, record it as pending
    await db
      .update(leads)
      .set({ conversionSentAt: new Date(), updatedAt: new Date() })
      .where(eq(leads.id, id))

    return reply.status(201).send({ data: conversion })
  })

  // DELETE /api/v1/leads/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await db.query.leads.findFirst({
      where: and(eq(leads.id, id), eq(leads.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Lead not found', statusCode: 404 })
    }

    await db.delete(leads).where(eq(leads.id, id))
    return reply.status(204).send()
  })
}
