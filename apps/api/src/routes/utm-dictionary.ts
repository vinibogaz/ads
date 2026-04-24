import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, utmDictionary } from '@ads/db'
import { z } from 'zod'

const UTM_PARAMETERS = ['source', 'medium', 'campaign', 'content', 'term'] as const

const entrySchema = z.object({
  utmParameter: z.enum(UTM_PARAMETERS),
  utmValue: z.string().min(1).max(255),
  label: z.string().min(1).max(255),
  segment: z.string().max(255).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().optional(),
})

export async function utmDictionaryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/utm-dictionary
  app.get('/', async (request, reply) => {
    const rows = await db.query.utmDictionary.findMany({
      where: eq(utmDictionary.tenantId, request.user.tid),
      orderBy: (t, { asc }) => [asc(t.utmParameter), asc(t.utmValue)],
    })
    return reply.send({ data: rows })
  })

  // POST /api/v1/utm-dictionary
  app.post('/', async (request, reply) => {
    const body = entrySchema.parse(request.body)

    // Check for duplicate
    const existing = await db.query.utmDictionary.findFirst({
      where: and(
        eq(utmDictionary.tenantId, request.user.tid),
        eq(utmDictionary.utmParameter, body.utmParameter),
        eq(utmDictionary.utmValue, body.utmValue)
      ),
    })
    if (existing) {
      return reply.status(409).send({ error: 'DUPLICATE', message: `Já existe uma entrada para ${body.utmParameter}=${body.utmValue}` })
    }

    const [row] = await db.insert(utmDictionary).values({
      tenantId: request.user.tid,
      ...body,
    }).returning()

    return reply.status(201).send({ data: row })
  })

  // PATCH /api/v1/utm-dictionary/:id
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = entrySchema.partial().parse(request.body)

    const existing = await db.query.utmDictionary.findFirst({
      where: and(eq(utmDictionary.id, id), eq(utmDictionary.tenantId, request.user.tid)),
    })
    if (!existing) return reply.status(404).send({ error: 'NOT_FOUND' })

    const [updated] = await db.update(utmDictionary)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(utmDictionary.id, id))
      .returning()

    return reply.send({ data: updated })
  })

  // DELETE /api/v1/utm-dictionary/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await db.query.utmDictionary.findFirst({
      where: and(eq(utmDictionary.id, id), eq(utmDictionary.tenantId, request.user.tid)),
    })
    if (!existing) return reply.status(404).send({ error: 'NOT_FOUND' })
    await db.delete(utmDictionary).where(eq(utmDictionary.id, id))
    return reply.status(204).send()
  })

  // GET /api/v1/utm-dictionary/translate — resolve UTM values for a lead
  app.get('/translate', async (request, reply) => {
    const { source, medium, campaign, content, term } = request.query as Record<string, string>
    const lookup: { parameter: string; value: string }[] = []
    if (source)   lookup.push({ parameter: 'source',   value: source })
    if (medium)   lookup.push({ parameter: 'medium',   value: medium })
    if (campaign) lookup.push({ parameter: 'campaign', value: campaign })
    if (content)  lookup.push({ parameter: 'content',  value: content })
    if (term)     lookup.push({ parameter: 'term',     value: term })

    if (lookup.length === 0) return reply.send({ data: {} })

    const all = await db.query.utmDictionary.findMany({
      where: eq(utmDictionary.tenantId, request.user.tid),
    })

    const result: Record<string, { label: string; segment?: string | null; color?: string | null }> = {}
    for (const { parameter, value } of lookup) {
      const match = all.find((r) => r.utmParameter === parameter && r.utmValue === value)
      if (match) result[parameter] = { label: match.label, segment: match.segment, color: match.color }
    }

    return reply.send({ data: result })
  })
}
