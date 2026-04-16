import type { FastifyInstance } from 'fastify'
import { db } from '@synthex/db'
import { sql } from 'drizzle-orm'

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      schema: {
        tags: ['health'],
        summary: 'Health check',
        security: [],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              version: { type: 'string' },
              timestamp: { type: 'string' },
              services: {
                type: 'object',
                properties: {
                  database: { type: 'string' },
                  redis: { type: 'string' },
                  aiWorker: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const services = {
        database: 'ok' as const,
        redis: 'ok' as const,
        aiWorker: 'ok' as const,
      }

      try {
        await db.execute(sql`SELECT 1`)
      } catch {
        services.database = 'error' as never
      }

      try {
        await app.redis.ping()
      } catch {
        services.redis = 'error' as never
      }

      const allOk = Object.values(services).every((s) => s === 'ok')

      return reply.status(allOk ? 200 : 503).send({
        status: allOk ? 'ok' : 'degraded',
        version: process.env['npm_package_version'] ?? '0.1.0',
        timestamp: new Date().toISOString(),
        services,
      })
    }
  )
}
