import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db, users, consentRecords, auditLogs } from '@ads/db'
import { z } from 'zod'

const consentSchema = z.object({
  type: z.enum(['analytics', 'marketing', 'terms']),
  granted: z.boolean(),
})

export async function privacyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // POST /api/v1/privacy/consent
  app.post(
    '/consent',
    { schema: { tags: ['privacy'], summary: 'Record LGPD consent' } },
    async (request, reply) => {
      const body = consentSchema.parse(request.body)

      await db.insert(consentRecords).values({
        tenantId: request.user.tid,
        userId: request.user.sub,
        type: body.type,
        granted: body.granted,
        ipAddress: request.ip,
      })

      await db.insert(auditLogs).values({
        tenantId: request.user.tid,
        userId: request.user.sub,
        action: 'consent.updated',
        entityType: 'consent',
        payload: { type: body.type, granted: body.granted },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      })

      return reply.status(201).send({ data: { recorded: true } })
    }
  )

  // POST /api/v1/privacy/export (DSAR)
  app.post(
    '/export',
    { schema: { tags: ['privacy'], summary: 'Request data export (DSAR — LGPD Art. 18)' } },
    async (request, reply) => {
      // Enqueue async export job
      await app.redis.lpush('privacy:export:queue', JSON.stringify({
        userId: request.user.sub,
        tenantId: request.user.tid,
        requestedAt: new Date().toISOString(),
      }))

      await db.insert(auditLogs).values({
        tenantId: request.user.tid,
        userId: request.user.sub,
        action: 'privacy.export_requested',
        entityType: 'user',
        entityId: request.user.sub,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      })

      return reply.status(202).send({
        data: {
          message: 'Data export requested. You will receive an email with your data within 72 hours.',
        },
      })
    }
  )

  // DELETE /api/v1/privacy/account
  app.delete(
    '/account',
    { schema: { tags: ['privacy'], summary: 'Request account deletion (LGPD Art. 18 VI)' } },
    async (request, reply) => {
      const body = request.body as { confirmation?: string }
      if (body?.confirmation !== 'DELETE_MY_ACCOUNT') {
        return reply.status(400).send({
          error: 'CONFIRMATION_REQUIRED',
          message: 'Send { "confirmation": "DELETE_MY_ACCOUNT" } to confirm deletion',
          statusCode: 400,
        })
      }

      // Mark user for deletion (actual deletion via background job with 30-day grace period)
      await db
        .update(users)
        .set({ status: 'inactive', updatedAt: new Date() })
        .where(eq(users.id, request.user.sub))

      await app.redis.lpush('privacy:deletion:queue', JSON.stringify({
        userId: request.user.sub,
        tenantId: request.user.tid,
        scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }))

      await db.insert(auditLogs).values({
        tenantId: request.user.tid,
        userId: request.user.sub,
        action: 'privacy.deletion_requested',
        entityType: 'user',
        entityId: request.user.sub,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      })

      return reply.status(202).send({
        data: {
          message: 'Account scheduled for deletion in 30 days. Contact support to cancel.',
        },
      })
    }
  )
}
