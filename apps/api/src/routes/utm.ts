import type { FastifyInstance } from 'fastify'
import { eq, and, desc } from 'drizzle-orm'
import { db, utmEntries } from '@ads/db'
import { z } from 'zod'

const trackUtmSchema = z.object({
  source: z.string().min(1).max(255),
  medium: z.string().max(255).optional(),
  campaign: z.string().max(255).optional(),
  content: z.string().max(255).optional(),
  term: z.string().max(255).optional(),
  landingPage: z.string().url().optional(),
  gclid: z.string().max(255).optional(),
  fbclid: z.string().max(255).optional(),
})

export async function utmRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/utm — list all UTM entries with validation status
  app.get('/', async (request, reply) => {
    const query = request.query as { invalid?: string }

    const rows = await db.query.utmEntries.findMany({
      where: eq(utmEntries.tenantId, request.user.tid),
      orderBy: (u, { desc }) => [desc(u.hitCount)],
    })

    const filtered = query.invalid === 'true'
      ? rows.filter((r) => !r.isValidForOfflineConversion)
      : rows

    return reply.send({ data: filtered })
  })

  // GET /api/v1/utm/summary — aggregated stats
  app.get('/summary', async (request, reply) => {
    const rows = await db.query.utmEntries.findMany({
      where: eq(utmEntries.tenantId, request.user.tid),
    })

    const total = rows.length
    const valid = rows.filter((r) => r.isValidForOfflineConversion).length
    const withGclid = rows.filter((r) => r.hasGclid).length
    const withFbclid = rows.filter((r) => r.hasFbclid).length

    const bySource = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.source] = (acc[r.source] ?? 0) + r.hitCount
      return acc
    }, {})

    return reply.send({
      data: {
        total,
        valid,
        invalid: total - valid,
        withGclid,
        withFbclid,
        bySource,
      },
    })
  })

  // POST /api/v1/utm/track — upsert UTM entry (called from tracking pixel or server)
  app.post('/track', {
    config: { skipAuth: true },
  }, async (request, reply) => {
    const tenantId = (request.query as { tid?: string }).tid
    if (!tenantId) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'tid required', statusCode: 400 })
    }

    const body = trackUtmSchema.parse(request.body)
    const hasGclid = !!body.gclid
    const hasFbclid = !!body.fbclid
    const isValid = !!(body.source && (hasGclid || hasFbclid))

    // Try to find existing entry to upsert
    const existing = await db.query.utmEntries.findFirst({
      where: and(
        eq(utmEntries.tenantId, tenantId),
        eq(utmEntries.source, body.source),
        body.medium ? eq(utmEntries.medium, body.medium) : undefined as any,
        body.campaign ? eq(utmEntries.campaign, body.campaign) : undefined as any,
      ),
    })

    if (existing) {
      await db
        .update(utmEntries)
        .set({
          hitCount: existing.hitCount + 1,
          hasGclid: existing.hasGclid || hasGclid,
          hasFbclid: existing.hasFbclid || hasFbclid,
          isValidForOfflineConversion: existing.isValidForOfflineConversion || isValid,
          lastSeenAt: new Date(),
        })
        .where(eq(utmEntries.id, existing.id))
    } else {
      await db.insert(utmEntries).values({
        tenantId,
        ...body,
        hasGclid,
        hasFbclid,
        isValidForOfflineConversion: isValid,
      })
    }

    return reply.status(200).send({ ok: true })
  })

  // DELETE /api/v1/utm/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await db.query.utmEntries.findFirst({
      where: and(eq(utmEntries.id, id), eq(utmEntries.tenantId, request.user.tid)),
    })

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'UTM entry not found', statusCode: 404 })
    }

    await db.delete(utmEntries).where(eq(utmEntries.id, id))
    return reply.status(204).send()
  })
}
