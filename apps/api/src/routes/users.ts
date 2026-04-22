import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, users, userInvitations } from '@ads/db'
import { z } from 'zod'
import { hasPermission, type UserRole } from '@ads/shared'
import { createHash, randomBytes } from 'crypto'

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'editor', 'viewer']),
})

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
})

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/users
  app.get(
    '/',
    {
      schema: {
        tags: ['users'],
        summary: 'List users in tenant',
      },
    },
    async (request, reply) => {
      const tenantUsers = await db.query.users.findMany({
        where: eq(users.tenantId, request.user.tid),
        columns: {
          passwordHash: false,
        },
      })

      return reply.send({ data: tenantUsers })
    }
  )

  // POST /api/v1/users/invite
  app.post(
    '/invite',
    {
      schema: {
        tags: ['users'],
        summary: 'Invite a new user',
      },
    },
    async (request, reply) => {
      if (!hasPermission(request.user.role as UserRole, 'admin')) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Only admins and owners can invite users',
          statusCode: 403,
        })
      }

      const body = inviteSchema.parse(request.body)

      const existing = await db.query.users.findFirst({
        where: and(eq(users.email, body.email.toLowerCase()), eq(users.tenantId, request.user.tid)),
      })

      if (existing) {
        return reply.status(409).send({
          error: 'USER_EXISTS',
          message: 'User already exists in this workspace',
          statusCode: 409,
        })
      }

      const rawToken = randomBytes(32).toString('base64url')
      const tokenHash = createHash('sha256').update(rawToken).digest('hex')

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await db.insert(userInvitations).values({
        tenantId: request.user.tid,
        email: body.email.toLowerCase(),
        role: body.role,
        tokenHash,
        invitedByUserId: request.user.sub,
        expiresAt,
      })

      // TODO: send invitation email via AWS SES
      app.log.info({ email: body.email }, 'Invitation created')

      return reply.status(201).send({
        data: { message: 'Invitation sent', email: body.email },
      })
    }
  )

  // PATCH /api/v1/users/:id/role
  app.patch(
    '/:id/role',
    {
      schema: {
        tags: ['users'],
        summary: 'Update user role',
      },
    },
    async (request, reply) => {
      if (!hasPermission(request.user.role as UserRole, 'admin')) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          statusCode: 403,
        })
      }

      const { id } = request.params as { id: string }
      const body = updateRoleSchema.parse(request.body)

      const [updated] = await db
        .update(users)
        .set({ role: body.role, updatedAt: new Date() })
        .where(and(eq(users.id, id), eq(users.tenantId, request.user.tid)))
        .returning({ id: users.id, email: users.email, role: users.role })

      if (!updated) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'User not found',
          statusCode: 404,
        })
      }

      return reply.send({ data: updated })
    }
  )

  // DELETE /api/v1/users/:id
  app.delete(
    '/:id',
    {
      schema: {
        tags: ['users'],
        summary: 'Remove user from tenant',
      },
    },
    async (request, reply) => {
      if (!hasPermission(request.user.role as UserRole, 'admin')) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          statusCode: 403,
        })
      }

      const { id } = request.params as { id: string }

      if (id === request.user.sub) {
        return reply.status(400).send({
          error: 'SELF_DELETE',
          message: 'Cannot remove yourself',
          statusCode: 400,
        })
      }

      await db
        .update(users)
        .set({ status: 'inactive', updatedAt: new Date() })
        .where(and(eq(users.id, id), eq(users.tenantId, request.user.tid)))

      return reply.status(204).send()
    }
  )
}
