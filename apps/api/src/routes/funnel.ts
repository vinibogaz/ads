import type { FastifyInstance } from 'fastify'
import { eq, and, asc, sql } from 'drizzle-orm'
import { db, funnelStages, leads } from '@ads/db'
import { z } from 'zod'

const createStageSchema = z.object({
  crmIntegrationId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  order: z.number().int().min(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isWon: z.boolean().optional().default(false),
  isLost: z.boolean().optional().default(false),
  conversionEvent: z.enum(['lead', 'qualified_lead', 'opportunity', 'sale', 'custom']).optional(),
})

const updateStageSchema = createStageSchema.partial()

export async function funnelRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/funnel/stages — with lead counts per stage
  app.get('/stages', async (request, reply) => {
    const stages = await db.query.funnelStages.findMany({
      where: eq(funnelStages.tenantId, request.user.tid),
      orderBy: (s, { asc }) => [asc(s.order)],
    })

    const leadCounts = await db
      .select({
        stageId: leads.stageId,
        count: sql<number>`count(*)::int`,
      })
      .from(leads)
      .where(eq(leads.tenantId, request.user.tid))
      .groupBy(leads.stageId)

    const countMap = Object.fromEntries(leadCounts.map((r) => [r.stageId, r.count]))

    return reply.send({
      data: stages.map((s) => ({ ...s, leadCount: countMap[s.id] ?? 0 })),
    })
  })

  // GET /api/v1/funnel/overview — funil completo com leads por estágio
  app.get('/overview', async (request, reply) => {
    const stages = await db.query.funnelStages.findMany({
      where: eq(funnelStages.tenantId, request.user.tid),
      orderBy: (s, { asc }) => [asc(s.order)],
    })

    const stagesWithLeads = await Promise.all(
      stages.map(async (stage) => {
        const stageLeads = await db.query.leads.findMany({
          where: and(
            eq(leads.tenantId, request.user.tid),
            eq(leads.stageId, stage.id)
          ),
          orderBy: (l, { desc }) => [desc(l.createdAt)],
          limit: 50,
        })
        return { ...stage, leads: stageLeads, leadCount: stageLeads.length }
      })
    )

    return reply.send({ data: stagesWithLeads })
  })

  // POST /api/v1/funnel/stages
  app.post('/stages', async (request, reply) => {
    const body = createStageSchema.parse(request.body)

    const [stage] = await db
      .insert(funnelStages)
      .values({ tenantId: request.user.tid, ...body })
      .returning()

    return reply.status(201).send({ data: stage })
  })

  // PATCH /api/v1/funnel/stages/:id
  app.patch('/stages/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateStageSchema.parse(request.body)

    const existing = await db.query.funnelStages.findFirst({
      where: and(eq(funnelStages.id, id), eq(funnelStages.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Stage not found', statusCode: 404 })
    }

    const [updated] = await db
      .update(funnelStages)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(funnelStages.id, id))
      .returning()

    return reply.send({ data: updated })
  })

  // DELETE /api/v1/funnel/stages/:id
  app.delete('/stages/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await db.query.funnelStages.findFirst({
      where: and(eq(funnelStages.id, id), eq(funnelStages.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Stage not found', statusCode: 404 })
    }

    await db.delete(funnelStages).where(eq(funnelStages.id, id))
    return reply.status(204).send()
  })
}
