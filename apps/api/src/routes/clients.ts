import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, clients } from '@ads/db'
import { z } from 'zod'

const clientSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#6366f1'),
  logoUrl: z.string().url().optional(),
})

export async function clientsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/clients
  app.get('/', async (request, reply) => {
    const rows = await db.query.clients.findMany({
      where: eq(clients.tenantId, request.user.tid),
      orderBy: (c, { asc }) => [asc(c.name)],
    })
    return reply.send({ data: rows })
  })

  // GET /api/v1/clients/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const row = await db.query.clients.findFirst({
      where: and(eq(clients.id, id), eq(clients.tenantId, request.user.tid)),
    })
    if (!row) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Client not found' })
    return reply.send({ data: row })
  })

  // POST /api/v1/clients
  app.post('/', async (request, reply) => {
    const body = clientSchema.parse(request.body)
    const [row] = await db.insert(clients).values({
      tenantId: request.user.tid,
      ...body,
    }).returning()
    return reply.status(201).send({ data: row })
  })

  // PATCH /api/v1/clients/:id
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = clientSchema.partial().parse(request.body)

    const existing = await db.query.clients.findFirst({
      where: and(eq(clients.id, id), eq(clients.tenantId, request.user.tid)),
    })
    if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Client not found' })

    const [updated] = await db.update(clients)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning()
    return reply.send({ data: updated })
  })

  // DELETE /api/v1/clients/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await db.query.clients.findFirst({
      where: and(eq(clients.id, id), eq(clients.tenantId, request.user.tid)),
    })
    if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Client not found' })
    await db.delete(clients).where(eq(clients.id, id))
    return reply.status(204).send()
  })
}
