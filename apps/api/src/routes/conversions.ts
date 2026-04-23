import type { FastifyInstance } from 'fastify'
import { eq, desc, count, and } from 'drizzle-orm'
import { db, offlineConversions, leads, adsPlatformIntegrations } from '@ads/db'

export async function conversionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/conversions — list with stats
  app.get('/', async (request, reply) => {
    const rows = await db.query.offlineConversions.findMany({
      where: eq(offlineConversions.tenantId, request.user.tid),
      orderBy: [desc(offlineConversions.createdAt)],
      limit: 200,
      with: {
        lead: { columns: { name: true, email: true } },
        integration: { columns: { name: true, platform: true } },
      },
    })
    return reply.send({ data: rows })
  })

  // GET /api/v1/conversions/stats
  app.get('/stats', async (request, reply) => {
    const rows = await db.query.offlineConversions.findMany({
      where: eq(offlineConversions.tenantId, request.user.tid),
      columns: { status: true, platform: true, event: true, value: true },
    })

    const total = rows.length
    const sent = rows.filter((r) => r.status === 'active').length
    const pending = rows.filter((r) => r.status === 'pending').length
    const failed = rows.filter((r) => r.status === 'error').length

    // Group by platform
    const byPlatform: Record<string, { total: number; sent: number; failed: number }> = {}
    for (const r of rows) {
      const entry = byPlatform[r.platform] ?? { total: 0, sent: 0, failed: 0 }
      entry.total++
      if (r.status === 'active') entry.sent++
      if (r.status === 'error') entry.failed++
      byPlatform[r.platform] = entry
    }

    // Group by event
    const byEvent: Record<string, number> = {}
    for (const r of rows) {
      byEvent[r.event] = (byEvent[r.event] ?? 0) + 1
    }

    return reply.send({
      data: {
        total,
        sent,
        pending,
        failed,
        successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
        byPlatform,
        byEvent,
      },
    })
  })
}
