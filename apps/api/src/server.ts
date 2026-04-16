import Fastify from 'fastify'
import { authPlugin } from './plugins/auth.js'
import { corsPlugin } from './plugins/cors.js'
import { helmetPlugin } from './plugins/helmet.js'
import { rateLimitPlugin } from './plugins/rateLimit.js'
import { redisPlugin } from './plugins/redis.js'
import { swaggerPlugin } from './plugins/swagger.js'
import { authRoutes } from './routes/auth.js'
import { tenantRoutes } from './routes/tenants.js'
import { userRoutes } from './routes/users.js'
import { contentRoutes } from './routes/content.js'
import { geoRoutes } from './routes/geo.js'
import { privacyRoutes } from './routes/privacy.js'
import { healthRoutes } from './routes/health.js'
import { env } from './config/env.js'

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  trustProxy: true,
  ajv: {
    customOptions: {
      coerceTypes: 'array',
      removeAdditional: 'all',
    },
  },
})

// Plugins (order matters)
await app.register(helmetPlugin)
await app.register(corsPlugin)
await app.register(rateLimitPlugin)
await app.register(redisPlugin)
await app.register(swaggerPlugin)
await app.register(authPlugin)

// Routes
await app.register(healthRoutes, { prefix: '/health' })
await app.register(authRoutes, { prefix: '/api/v1/auth' })
await app.register(tenantRoutes, { prefix: '/api/v1/tenants' })
await app.register(userRoutes, { prefix: '/api/v1/users' })
await app.register(contentRoutes, { prefix: '/api/v1/content' })
await app.register(geoRoutes, { prefix: '/api/v1/geo' })
await app.register(privacyRoutes, { prefix: '/api/v1/privacy' })

// Global error handler
app.setErrorHandler((error, request, reply) => {
  app.log.error({ err: error, url: request.url }, 'Unhandled error')

  if (error.validation) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      statusCode: 400,
      details: error.validation,
    })
  }

  const statusCode = error.statusCode ?? 500
  return reply.status(statusCode).send({
    error: error.code ?? 'INTERNAL_ERROR',
    message: statusCode === 500 ? 'Internal server error' : error.message,
    statusCode,
  })
})

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`Synthex API running on port ${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
