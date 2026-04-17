import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { JwtPayload } from '@orffia/shared'
import { env } from '../config/env.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
    authenticateOptional: (request: FastifyRequest) => Promise<void>
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(fastifyJwt, {
    secret: {
      private: env.JWT_ACCESS_SECRET,
      public: env.JWT_ACCESS_SECRET,
    },
    sign: {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    },
  })

  app.decorate('authenticate', async (request: FastifyRequest) => {
    if ((request.routeOptions as any).config?.skipAuth) return
    try {
      await request.jwtVerify()
    } catch (error: unknown) {
      throw app.httpErrors.unauthorized('Invalid or expired token')
    }
  })

  app.decorate('authenticateOptional', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify()
    } catch {
      // No-op — request proceeds without user context
    }
  })
})
