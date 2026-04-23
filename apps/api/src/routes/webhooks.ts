import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, webhooks, webhookEvents, leads } from '@ads/db'
import { z } from 'zod'
import crypto from 'node:crypto'

const createWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH']).optional().default('POST'),
  secret: z.string().max(255).optional(),
  fieldMapping: z.record(z.string()).optional().default({}),
})

const updateWebhookSchema = createWebhookSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export async function webhooksRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/webhooks
  app.get('/', async (request, reply) => {
    const rows = await db.query.webhooks.findMany({
      where: eq(webhooks.tenantId, request.user.tid),
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    })
    return reply.send({ data: rows })
  })

  // GET /api/v1/webhooks/:id/events
  app.get('/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string }

    const webhook = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.tenantId, request.user.tid)),
    })

    if (!webhook) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Webhook not found', statusCode: 404 })
    }

    const events = await db.query.webhookEvents.findMany({
      where: eq(webhookEvents.webhookId, id),
      orderBy: (e, { desc }) => [desc(e.createdAt)],
      limit: 100,
    })

    return reply.send({ data: events })
  })

  // POST /api/v1/webhooks
  app.post('/', async (request, reply) => {
    const body = createWebhookSchema.parse(request.body)

    const [webhook] = await db
      .insert(webhooks)
      .values({ tenantId: request.user.tid, ...body })
      .returning()

    return reply.status(201).send({ data: { ...webhook, secret: undefined } })
  })

  // PATCH /api/v1/webhooks/:id
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateWebhookSchema.parse(request.body)

    const existing = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Webhook not found', statusCode: 404 })
    }

    const [updated] = await db
      .update(webhooks)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(webhooks.id, id))
      .returning()

    return reply.send({ data: { ...updated, secret: undefined } })
  })

  // DELETE /api/v1/webhooks/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Webhook not found', statusCode: 404 })
    }

    await db.delete(webhooks).where(eq(webhooks.id, id))
    return reply.status(204).send()
  })

  // POST /api/v1/webhooks/receive/:webhookId — public endpoint, receives lead data
  app.post('/receive/:webhookId', {
    config: { skipAuth: true },
  }, async (request, reply) => {
    const { webhookId } = request.params as { webhookId: string }

    const webhook = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, webhookId), eq(webhooks.isActive, true)),
    })

    if (!webhook) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Webhook not found', statusCode: 404 })
    }

    // Verify HMAC signature if secret configured
    if (webhook.secret) {
      const signature = (request.headers['x-webhook-signature'] ?? '') as string
      const payload = JSON.stringify(request.body)
      const expected = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex')
      if (signature !== `sha256=${expected}`) {
        return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid signature', statusCode: 401 })
      }
    }

    const payload = request.body as Record<string, unknown>
    const mapping = webhook.fieldMapping as Record<string, string>

    // Map incoming fields to lead fields
    const leadData: Record<string, unknown> = {}
    for (const [ourField, theirField] of Object.entries(mapping)) {
      if (payload[theirField] !== undefined) {
        leadData[ourField] = payload[theirField]
      }
    }

    // Insert lead
    const [lead] = await db
      .insert(leads)
      .values({ tenantId: webhook.tenantId, ...leadData })
      .returning()

    // Log event
    await db.insert(webhookEvents).values({
      webhookId: webhook.id,
      tenantId: webhook.tenantId,
      payload,
      responseStatus: 201,
      processedAt: new Date(),
    })

    await db
      .update(webhooks)
      .set({ lastTriggeredAt: new Date(), updatedAt: new Date() })
      .where(eq(webhooks.id, webhookId))

    return reply.status(201).send({ data: { leadId: lead?.id } })
  })
}
