import type { FastifyInstance } from 'fastify'
import { eq, and, desc } from 'drizzle-orm'
import { db, geoMonitors, geoScores, geoAlerts } from '@synthex/db'
import { z } from 'zod'

const createMonitorSchema = z.object({
  brandName: z.string().min(1).max(255),
  brandAliases: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),
  keywords: z.array(z.string()).min(1),
  engines: z.array(z.enum(['chatgpt', 'gemini', 'claude', 'perplexity', 'grok'])).default([
    'chatgpt', 'gemini', 'claude', 'perplexity', 'grok',
  ]),
  frequency: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
})

export async function geoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/geo/monitors
  app.get(
    '/monitors',
    { schema: { tags: ['geo'], summary: 'List GEO monitors' } },
    async (request, reply) => {
      const monitors = await db.query.geoMonitors.findMany({
        where: eq(geoMonitors.tenantId, request.user.tid),
        orderBy: [desc(geoMonitors.createdAt)],
      })
      return reply.send({ data: monitors })
    }
  )

  // POST /api/v1/geo/monitors
  app.post(
    '/monitors',
    { schema: { tags: ['geo'], summary: 'Create GEO monitor' } },
    async (request, reply) => {
      const body = createMonitorSchema.parse(request.body)

      const [monitor] = await db
        .insert(geoMonitors)
        .values({ ...body, tenantId: request.user.tid })
        .returning()

      return reply.status(201).send({ data: monitor })
    }
  )

  // GET /api/v1/geo/monitors/:id
  app.get(
    '/monitors/:id',
    { schema: { tags: ['geo'], summary: 'Get GEO monitor' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const monitor = await db.query.geoMonitors.findFirst({
        where: and(eq(geoMonitors.id, id), eq(geoMonitors.tenantId, request.user.tid)),
        with: { scores: { orderBy: [desc(geoScores.calculatedDate)], limit: 30 } },
      })

      if (!monitor) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Monitor not found', statusCode: 404 })
      }

      return reply.send({ data: monitor })
    }
  )

  // DELETE /api/v1/geo/monitors/:id
  app.delete(
    '/monitors/:id',
    { schema: { tags: ['geo'], summary: 'Delete GEO monitor' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      await db
        .update(geoMonitors)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(geoMonitors.id, id), eq(geoMonitors.tenantId, request.user.tid)))

      return reply.status(204).send()
    }
  )

  // GET /api/v1/geo/scores
  app.get(
    '/scores',
    { schema: { tags: ['geo'], summary: 'Get GEO scores' } },
    async (request, reply) => {
      const query = request.query as { monitorId?: string; days?: string }
      const conditions = [eq(geoScores.tenantId, request.user.tid)]
      if (query.monitorId) conditions.push(eq(geoScores.monitorId, query.monitorId))

      const scores = await db.query.geoScores.findMany({
        where: and(...conditions),
        orderBy: [desc(geoScores.calculatedDate)],
        limit: parseInt(query.days ?? '30'),
      })

      return reply.send({ data: scores })
    }
  )

  // POST /api/v1/geo/monitors/:id/run
  app.post(
    '/monitors/:id/run',
    { schema: { tags: ['geo'], summary: 'Trigger manual GEO collection' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const monitor = await db.query.geoMonitors.findFirst({
        where: and(eq(geoMonitors.id, id), eq(geoMonitors.tenantId, request.user.tid)),
      })

      if (!monitor) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Monitor not found', statusCode: 404 })
      }

      // Enqueue collection job in Redis
      await app.redis.lpush('geo:collection:queue', JSON.stringify({
        monitorId: id,
        tenantId: request.user.tid,
        triggeredAt: new Date().toISOString(),
        manual: true,
      }))

      return reply.status(202).send({ data: { message: 'Collection triggered', monitorId: id } })
    }
  )
}
