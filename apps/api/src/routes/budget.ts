import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, budgets, adsPlatformIntegrations } from '@ads/db'
import { z } from 'zod'

const createBudgetSchema = z.object({
  integrationId: z.string().uuid().optional(),
  platform: z.enum(['meta', 'google', 'linkedin', 'tiktok', 'twitter', 'pinterest', 'taboola', 'other']),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024).max(2100),
  plannedAmount: z.number().positive(),
  currency: z.string().length(3).optional().default('BRL'),
  notes: z.string().max(500).optional(),
})

const updateBudgetSchema = z.object({
  plannedAmount: z.number().positive().optional(),
  spentAmount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
})

export async function budgetRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/budget?month=4&year=2026
  app.get('/', async (request, reply) => {
    const query = request.query as { month?: string; year?: string }
    const now = new Date()
    const month = query.month ? parseInt(query.month) : now.getMonth() + 1
    const year = query.year ? parseInt(query.year) : now.getFullYear()

    const rows = await db.query.budgets.findMany({
      where: and(
        eq(budgets.tenantId, request.user.tid),
        eq(budgets.month, month),
        eq(budgets.year, year)
      ),
      with: { integration: true },
    })

    const summary = rows.map((b) => ({
      ...b,
      plannedAmount: parseFloat(b.plannedAmount),
      spentAmount: parseFloat(b.spentAmount),
      remainingAmount: parseFloat(b.plannedAmount) - parseFloat(b.spentAmount),
      percentUsed:
        parseFloat(b.plannedAmount) > 0
          ? Math.round((parseFloat(b.spentAmount) / parseFloat(b.plannedAmount)) * 100)
          : 0,
    }))

    return reply.send({ data: summary })
  })

  // GET /api/v1/budget/history?platform=meta
  app.get('/history', async (request, reply) => {
    const query = request.query as { platform?: string }
    const conditions = [eq(budgets.tenantId, request.user.tid)]
    if (query.platform) {
      conditions.push(eq(budgets.platform, query.platform as any))
    }

    const rows = await db.query.budgets.findMany({
      where: and(...conditions),
      orderBy: (b, { desc }) => [desc(b.year), desc(b.month)],
    })

    return reply.send({ data: rows })
  })

  // POST /api/v1/budget
  app.post('/', async (request, reply) => {
    const body = createBudgetSchema.parse(request.body)

    const [budget] = await db
      .insert(budgets)
      .values({
        tenantId: request.user.tid,
        ...body,
        plannedAmount: body.plannedAmount.toString(),
      })
      .returning()

    return reply.status(201).send({ data: budget })
  })

  // PATCH /api/v1/budget/:id
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateBudgetSchema.parse(request.body)

    const existing = await db.query.budgets.findFirst({
      where: and(eq(budgets.id, id), eq(budgets.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Budget not found', statusCode: 404 })
    }

    const [updated] = await db
      .update(budgets)
      .set({
        ...(body.plannedAmount !== undefined && { plannedAmount: body.plannedAmount.toString() }),
        ...(body.spentAmount !== undefined && { spentAmount: body.spentAmount.toString() }),
        ...(body.notes !== undefined && { notes: body.notes }),
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id))
      .returning()

    return reply.send({ data: updated })
  })

  // DELETE /api/v1/budget/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await db.query.budgets.findFirst({
      where: and(eq(budgets.id, id), eq(budgets.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Budget not found', statusCode: 404 })
    }

    await db.delete(budgets).where(eq(budgets.id, id))
    return reply.status(204).send()
  })
}
