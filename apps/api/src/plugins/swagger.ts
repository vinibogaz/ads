import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { FastifyInstance } from 'fastify'

export const swaggerPlugin = fp(async (app: FastifyInstance) => {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Synthex API',
        description: 'Synthex Marketing Intelligence Hub — REST API',
        version: '1.0.0',
        contact: {
          name: 'Synthex',
          url: 'https://synthex.com.br',
        },
      },
      servers: [
        { url: 'http://localhost:3001', description: 'Development' },
        { url: 'https://api.synthex.com.br', description: 'Production' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'auth', description: 'Authentication & authorization' },
        { name: 'tenants', description: 'Tenant management' },
        { name: 'users', description: 'User management' },
        { name: 'content', description: 'Content Engine' },
        { name: 'geo', description: 'GEO Monitor' },
        { name: 'privacy', description: 'LGPD / Privacy' },
      ],
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  })
})
