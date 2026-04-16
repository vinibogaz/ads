import type { FastifyInstance } from 'fastify'
import { eq, and, desc } from 'drizzle-orm'
import { db, articles, contentProjects } from '@synthex/db'
import { z } from 'zod'
import { env } from '../config/env.js'

const generateArticleSchema = z.object({
  format: z.enum(['blog', 'listicle', 'how-to', 'news', 'comparison', 'opinion', 'product-review', 'pillar']),
  language: z.string().default('pt-BR'),
  tone: z.enum(['authoritative', 'conversational', 'professional', 'friendly', 'urgency', 'educational']),
  primaryKeyword: z.string().min(2).max(200),
  secondaryKeywords: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  wordCount: z.number().min(300).max(10000).optional(),
  promptTemplateId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
})

export async function contentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // POST /api/v1/content/generate/article
  app.post(
    '/generate/article',
    {
      schema: {
        tags: ['content'],
        summary: 'Trigger article generation (async, returns job_id)',
      },
    },
    async (request, reply) => {
      const body = generateArticleSchema.parse(request.body)

      // Forward to AI worker
      const workerResponse = await fetch(`${env.AI_WORKER_URL}/api/generate/article`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Secret': env.AI_WORKER_SECRET,
          'X-Tenant-Id': request.user.tid,
          'X-User-Id': request.user.sub,
        },
        body: JSON.stringify(body),
      })

      if (!workerResponse.ok) {
        const error = await workerResponse.text()
        app.log.error({ error }, 'AI worker error')
        return reply.status(502).send({
          error: 'AI_WORKER_ERROR',
          message: 'Failed to start generation',
          statusCode: 502,
        })
      }

      const result = await workerResponse.json() as { jobId: string }
      return reply.status(202).send({ data: result })
    }
  )

  // GET /api/v1/content/jobs/:jobId
  app.get(
    '/jobs/:jobId',
    {
      schema: {
        tags: ['content'],
        summary: 'Get generation job status',
      },
    },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string }

      const cached = await app.redis.get(`job:${request.user.tid}:${jobId}`)
      if (!cached) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Job not found',
          statusCode: 404,
        })
      }

      return reply.send({ data: JSON.parse(cached) })
    }
  )

  // GET /api/v1/content/articles
  app.get(
    '/articles',
    {
      schema: {
        tags: ['content'],
        summary: 'List articles',
      },
    },
    async (request, reply) => {
      const query = request.query as { page?: string; perPage?: string; projectId?: string }
      const page = Math.max(1, parseInt(query.page ?? '1'))
      const perPage = Math.min(100, parseInt(query.perPage ?? '20'))
      const offset = (page - 1) * perPage

      const conditions = [eq(articles.tenantId, request.user.tid)]
      if (query.projectId) {
        conditions.push(eq(articles.projectId, query.projectId))
      }

      const results = await db.query.articles.findMany({
        where: and(...conditions),
        orderBy: [desc(articles.createdAt)],
        limit: perPage,
        offset,
        columns: {
          content: false, // exclude heavy content in list
        },
      })

      return reply.send({ data: results })
    }
  )

  // GET /api/v1/content/articles/:id
  app.get(
    '/articles/:id',
    {
      schema: {
        tags: ['content'],
        summary: 'Get article by ID',
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const article = await db.query.articles.findFirst({
        where: and(eq(articles.id, id), eq(articles.tenantId, request.user.tid)),
      })

      if (!article) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Article not found',
          statusCode: 404,
        })
      }

      return reply.send({ data: article })
    }
  )

  // PATCH /api/v1/content/articles/:id
  app.patch(
    '/articles/:id',
    {
      schema: {
        tags: ['content'],
        summary: 'Update article',
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as Partial<{
        title: string
        content: string
        status: string
        metaTitle: string
        metaDescription: string
      }>

      const [updated] = await db
        .update(articles)
        .set({ ...body, updatedAt: new Date() })
        .where(and(eq(articles.id, id), eq(articles.tenantId, request.user.tid)))
        .returning()

      if (!updated) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Article not found',
          statusCode: 404,
        })
      }

      return reply.send({ data: updated })
    }
  )

  // DELETE /api/v1/content/articles/:id
  app.delete(
    '/articles/:id',
    {
      schema: {
        tags: ['content'],
        summary: 'Delete article',
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      await db
        .update(articles)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(and(eq(articles.id, id), eq(articles.tenantId, request.user.tid)))

      return reply.status(204).send()
    }
  )
}
