import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db, tenants } from '@orffia/db'
import { z } from 'zod'

const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  settings: z
    .object({
      locale: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
})

export async function tenantRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/tenants/me
  app.get(
    '/me',
    {
      schema: {
        tags: ['tenants'],
        summary: 'Get current tenant',
      },
    },
    async (request, reply) => {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, request.user.tid),
      })

      if (!tenant) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Tenant not found',
          statusCode: 404,
        })
      }

      return reply.send({ data: tenant })
    }
  )

  // PATCH /api/v1/tenants/me
  app.patch(
    '/me',
    {
      schema: {
        tags: ['tenants'],
        summary: 'Update tenant settings',
      },
    },
    async (request, reply) => {
      const body = updateTenantSchema.parse(request.body)

      const [updated] = await db
        .update(tenants)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.settings && { settings: body.settings }),
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, request.user.tid))
        .returning()

      return reply.send({ data: updated })
    }
  )
}
