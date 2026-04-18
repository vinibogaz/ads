import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, cmsIntegrations, articles, contentSchedules } from '@orffia/db'
import { ghostPublish, ghostTest } from '../services/integrations/ghost.js'
import { webflowPublish, webflowTest } from '../services/integrations/webflow.js'
import { webhookDispatch, webhookTest } from '../services/integrations/webhook.js'

type Provider = 'wordpress' | 'ghost' | 'webflow' | 'n8n' | 'zapier' | 'linkedin'

export async function integrationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/integrations — list connected integrations for tenant
  app.get(
    '/',
    { schema: { tags: ['integrations'], summary: 'List connected integrations' } },
    async (request, reply) => {
      const results = await db.query.cmsIntegrations.findMany({
        where: eq(cmsIntegrations.tenantId, request.user.tid),
        columns: { credentialsEnc: false }, // never expose credentials
      })
      return reply.send({ data: results })
    }
  )

  // POST /api/v1/integrations/:provider/test — test credentials without saving
  app.post(
    '/:provider/test',
    { schema: { tags: ['integrations'], summary: 'Test integration credentials' } },
    async (request, reply) => {
      const { provider } = request.params as { provider: Provider }
      const body = request.body as Record<string, string>

      const creds = body as Record<string, string | undefined>
      let ok = false
      try {
        if (provider === 'ghost' && creds['url'] && creds['staffApiKey']) {
          ok = await ghostTest({ url: creds['url'], staffApiKey: creds['staffApiKey'] })
        } else if (provider === 'webflow' && creds['apiToken'] && creds['siteId'] && creds['collectionId']) {
          ok = await webflowTest({ apiToken: creds['apiToken'], siteId: creds['siteId'], collectionId: creds['collectionId'] })
        } else if ((provider === 'n8n' || provider === 'zapier') && creds['webhookUrl']) {
          ok = await webhookTest({ url: creds['webhookUrl'] })
        } else {
          return reply.status(400).send({ error: 'UNSUPPORTED_PROVIDER', statusCode: 400 })
        }
      } catch {
        ok = false
      }

      return reply.send({ data: { ok } })
    }
  )

  // POST /api/v1/integrations/:provider/connect — save credentials
  app.post(
    '/:provider/connect',
    { schema: { tags: ['integrations'], summary: 'Connect integration and save credentials' } },
    async (request, reply) => {
      const { provider } = request.params as { provider: Provider }
      const body = request.body as Record<string, string>

      // Simple AES placeholder — in production use proper encryption with KMS
      const credentialsEnc = Buffer.from(JSON.stringify(body)).toString('base64')

      const [integration] = await db
        .insert(cmsIntegrations)
        .values({
          tenantId: request.user.tid,
          type: provider,
          name: body.name ?? provider,
          credentialsEnc,
          settings: {},
          status: 'active',
          lastTestedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning()

      return reply.status(201).send({ data: { id: integration?.id } })
    }
  )

  // POST /api/v1/integrations/publish/:scheduleId — immediate publish via integration
  app.post(
    '/publish/:scheduleId',
    { schema: { tags: ['integrations'], summary: 'Publish article now via scheduled integration' } },
    async (request, reply) => {
      const { scheduleId } = request.params as { scheduleId: string }

      const schedule = await db.query.contentSchedules.findFirst({
        where: and(
          eq(contentSchedules.id, scheduleId),
          eq(contentSchedules.tenantId, request.user.tid),
        ),
        with: {
          article: true,
          integration: true,
        },
      })

      if (!schedule) {
        return reply.status(404).send({ error: 'NOT_FOUND', statusCode: 404 })
      }

      const { article, integration } = schedule as any
      const credentials = JSON.parse(Buffer.from(integration.credentialsEnc, 'base64').toString())
      const provider = integration.type as Provider

      let publishedUrl = ''
      try {
        if (provider === 'ghost') {
          const result = await ghostPublish(credentials, {
            title: article.title,
            html: article.content ?? '',
            status: 'published',
            metaTitle: article.metaTitle,
            metaDescription: article.metaDescription,
            slug: article.slug,
          })
          publishedUrl = result.url
        } else if (provider === 'webflow') {
          await webflowPublish(credentials, {
            title: article.title,
            content: article.content ?? '',
            metaTitle: article.metaTitle,
            metaDescription: article.metaDescription,
            slug: article.slug,
          })
        } else if (provider === 'n8n' || provider === 'zapier') {
          await webhookDispatch(
            { url: credentials.webhookUrl, secret: credentials.secret },
            {
              articleId: article.id,
              title: article.title,
              content: article.content ?? '',
              slug: article.slug,
              metaTitle: article.metaTitle,
              metaDescription: article.metaDescription,
              keywords: article.keywords,
              seoScore: article.seoScore,
              format: article.format,
              scheduledAt: schedule.scheduledAt?.toISOString(),
            },
          )
        } else {
          return reply.status(400).send({ error: 'UNSUPPORTED_PROVIDER', statusCode: 400 })
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown publish error'
        await db.update(contentSchedules)
          .set({ status: 'failed', errorMessage: msg })
          .where(eq(contentSchedules.id, scheduleId))
        return reply.status(502).send({ error: 'PUBLISH_FAILED', message: msg, statusCode: 502 })
      }

      await db.update(contentSchedules)
        .set({ status: 'published', publishedUrl: publishedUrl || null })
        .where(eq(contentSchedules.id, scheduleId))

      return reply.send({ data: { published: true, url: publishedUrl } })
    }
  )
}
