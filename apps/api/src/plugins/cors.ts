import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import { env } from '../config/env.js'

export const corsPlugin = fp(async (app: FastifyInstance) => {
  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? env.CORS_ORIGIN.split(',') : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  })
})
