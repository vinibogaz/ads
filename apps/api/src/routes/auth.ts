import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.js'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
  tenantName: z.string().min(2).max(100),
  tenantSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app)

  // POST /api/v1/auth/register
  app.post(
    '/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Register new account (creates tenant + owner)',
        security: [],
        body: {
          type: 'object',
          required: ['email', 'password', 'name', 'tenantName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string' },
            tenantName: { type: 'string' },
            tenantSlug: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = registerSchema.parse(request.body)
      const tokens = await authService.register(body)
      return reply.status(201).send({ data: tokens })
    }
  )

  // POST /api/v1/auth/login
  app.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Login',
        security: [],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = loginSchema.parse(request.body)
      const tokens = await authService.login(body.email, body.password)
      return reply.send({ data: tokens })
    }
  )

  // POST /api/v1/auth/refresh
  app.post(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Refresh access token',
        security: [],
      },
    },
    async (request, reply) => {
      const body = refreshSchema.parse(request.body)
      const tokens = await authService.refresh(body.refreshToken, request.ip)
      return reply.send({ data: tokens })
    }
  )

  // POST /api/v1/auth/logout
  app.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Logout (revoke refresh token)',
        security: [],
      },
    },
    async (request, reply) => {
      const body = refreshSchema.safeParse(request.body)
      if (body.success) {
        await authService.logout(body.data.refreshToken)
      }
      return reply.status(204).send()
    }
  )

  // POST /api/v1/auth/logout-all
  app.post(
    '/logout-all',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Logout from all devices (revoke all refresh tokens)',
      },
    },
    async (request, reply) => {
      await authService.revokeAllUserSessions(request.user.sub)
      return reply.status(204).send()
    }
  )

  // GET /api/v1/auth/me
  app.get(
    '/me',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Get current user info from token',
      },
    },
    async (request, reply) => {
      return reply.send({ data: request.user })
    }
  )

  // POST /api/v1/auth/change-password
  app.post(
    '/change-password',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Change current user password',
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const body = z
        .object({
          currentPassword: z.string(),
          newPassword: z.string().min(8).max(128),
        })
        .parse(request.body)

      await authService.changePassword(request.user.sub, body.currentPassword, body.newPassword)
      // Revoke all sessions so user must re-login everywhere
      await authService.revokeAllUserSessions(request.user.sub)
      return reply.status(204).send()
    }
  )
}
