import Fastify from 'fastify'
import fastifySensible from '@fastify/sensible'
import { authPlugin } from './plugins/auth.js'
import { corsPlugin } from './plugins/cors.js'
import { helmetPlugin } from './plugins/helmet.js'
import { rateLimitPlugin } from './plugins/rateLimit.js'
import { redisPlugin } from './plugins/redis.js'
import { swaggerPlugin } from './plugins/swagger.js'
import { authRoutes } from './routes/auth.js'
import { tenantRoutes } from './routes/tenants.js'
import { userRoutes } from './routes/users.js'
import { privacyRoutes } from './routes/privacy.js'
import { healthRoutes } from './routes/health.js'
import { budgetRoutes } from './routes/budget.js'
import { leadsRoutes } from './routes/leads.js'
import { funnelRoutes } from './routes/funnel.js'
import { webhooksRoutes } from './routes/webhooks.js'
import { utmRoutes } from './routes/utm.js'
import { adsIntegrationsRoutes } from './routes/ads-integrations.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { conversionsRoutes } from './routes/conversions.js'
import { metaOAuthRoutes } from './routes/meta-oauth.js'
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
await app.register(fastifySensible)
await app.register(rateLimitPlugin)
await app.register(redisPlugin)
await app.register(swaggerPlugin)
await app.register(authPlugin)

// Core routes
await app.register(healthRoutes, { prefix: '/health' })
await app.register(authRoutes, { prefix: '/api/v1/auth' })
await app.register(tenantRoutes, { prefix: '/api/v1/tenants' })
await app.register(userRoutes, { prefix: '/api/v1/users' })
await app.register(privacyRoutes, { prefix: '/api/v1/privacy' })

// Orffia Ads routes
await app.register(budgetRoutes, { prefix: '/api/v1/budget' })
await app.register(leadsRoutes, { prefix: '/api/v1/leads' })
await app.register(funnelRoutes, { prefix: '/api/v1/funnel' })
await app.register(webhooksRoutes, { prefix: '/api/v1/webhooks' })
await app.register(utmRoutes, { prefix: '/api/v1/utm' })
await app.register(adsIntegrationsRoutes, { prefix: '/api/v1/ads-integrations' })
await app.register(dashboardRoutes, { prefix: '/api/v1/dashboard' })
await app.register(conversionsRoutes, { prefix: '/api/v1/conversions' })
await app.register(metaOAuthRoutes, { prefix: '/api/v1/auth' })

// Global error handler
app.setErrorHandler((error, request, reply) => {
  const err = error as any
  app.log.error({ err, url: request.url }, 'Unhandled error')

  if (err.validation) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      statusCode: 400,
      details: err.validation,
    })
  }

  const statusCode = err.statusCode ?? 500
  return reply.status(statusCode).send({
    error: err.code ?? 'INTERNAL_ERROR',
    message: statusCode === 500 ? 'Internal server error' : err.message,
    statusCode,
  })
})

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`Orffia Ads API running on port ${env.PORT}`)
  } catch (error: unknown) {
    const err = error as Error
    app.log.error(err)
    process.exit(1)
  }
}

start()
