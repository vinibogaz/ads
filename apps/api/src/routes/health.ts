import type { FastifyInstance } from 'fastify'
import { db } from '@ads/db'
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

      if (allOk) {
        return reply.status(200).send({
          status: 'ok',
          version: process.env['npm_package_version'] ?? '0.1.0',
          timestamp: new Date().toISOString(),
          services,
        })
      } else {
        // @ts-expect-error - Fastify types don't infer 503 status code correctly
        return reply.status(503).send({
          status: 'degraded',
          version: process.env['npm_package_version'] ?? '0.1.0',
          timestamp: new Date().toISOString(),
          services,
        })
      }
    }
  )
}
