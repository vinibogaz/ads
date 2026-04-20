import type { FastifyInstance } from 'fastify'
import { eq, and, desc, count, avg, sql } from 'drizzle-orm'
import {
  db,
  geoMonitors,
  geoScores,
  geoAlerts,
  geoPrompts,
  geoPromptResults,
  geoCompetitors,
  geoActionPlans,
  geoCitedSources,
  geoMonitoredPages,
  geoSiteDiagnostics,
} from '@orffia/db'
import { z } from 'zod'
import { env } from '../config/env.js'

const createMonitorSchema = z.object({
  brandName: z.string().min(1).max(255),
  brandAliases: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),
  keywords: z.array(z.string()).min(1),
  targetUrls: z.array(z.string()).default([]),
  engines: z.array(z.enum(['chatgpt', 'gemini', 'claude', 'perplexity', 'grok'])).default([
    'chatgpt', 'gemini', 'claude', 'perplexity', 'grok',
  ]),
  frequency: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
})

export async function geoRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/geo/monitors
  app.get(
    '/monitors',
    { schema: { tags: ['geo'], summary: 'List GEO monitors' } },
    async (request, reply) => {
      const monitors = await db.query.geoMonitors.findMany({
        where: eq(geoMonitors.tenantId, request.user.tid),
        orderBy: [desc(geoMonitors.createdAt)],
      })
      return reply.send({ data: monitors })
    }
  )

  // POST /api/v1/geo/monitors
  app.post(
    '/monitors',
    { schema: { tags: ['geo'], summary: 'Create GEO monitor' } },
    async (request, reply) => {
      const body = createMonitorSchema.parse(request.body)

      const [monitor] = await db
        .insert(geoMonitors)
        .values({ ...body, tenantId: request.user.tid })
        .returning()

      return reply.status(201).send({ data: monitor })
    }
  )

  // GET /api/v1/geo/monitors/:id
  app.get(
    '/monitors/:id',
    { schema: { tags: ['geo'], summary: 'Get GEO monitor' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const monitor = await db.query.geoMonitors.findFirst({
        where: and(eq(geoMonitors.id, id), eq(geoMonitors.tenantId, request.user.tid)),
        with: { scores: { orderBy: [desc(geoScores.calculatedDate)], limit: 30 } },
      })

      if (!monitor) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Monitor not found', statusCode: 404 })
      }

      return reply.send({ data: monitor })
    }
  )

  // DELETE /api/v1/geo/monitors/:id
  app.delete(
    '/monitors/:id',
    { schema: { tags: ['geo'], summary: 'Delete GEO monitor' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      await db
        .update(geoMonitors)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(geoMonitors.id, id), eq(geoMonitors.tenantId, request.user.tid)))

      return reply.status(204).send()
    }
  )

  // GET /api/v1/geo/scores
  app.get(
    '/scores',
    { schema: { tags: ['geo'], summary: 'Get GEO scores' } },
    async (request, reply) => {
      const query = request.query as { monitorId?: string; days?: string }
      const conditions = [eq(geoScores.tenantId, request.user.tid)]
      if (query.monitorId) conditions.push(eq(geoScores.monitorId, query.monitorId))

      const scores = await db.query.geoScores.findMany({
        where: and(...conditions),
        orderBy: [desc(geoScores.calculatedDate)],
        limit: parseInt(query.days ?? '30'),
      })

      return reply.send({ data: scores })
    }
  )

  // POST /api/v1/geo/monitors/:id/run
  app.post(
    '/monitors/:id/run',
    { schema: { tags: ['geo'], summary: 'Trigger manual GEO collection' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const monitor = await db.query.geoMonitors.findFirst({
        where: and(eq(geoMonitors.id, id), eq(geoMonitors.tenantId, request.user.tid)),
      })

      if (!monitor) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Monitor not found', statusCode: 404 })
      }

      // Enqueue collection job in Redis
      await app.redis.lpush('geo:collection:queue', JSON.stringify({
        monitorId: id,
        tenantId: request.user.tid,
        triggeredAt: new Date().toISOString(),
        manual: true,
      }))

      return reply.status(202).send({ data: { message: 'Collection triggered', monitorId: id } })
    }
  )

  // POST /api/v1/geo/monitors/:id/collect
  // Calls ai-worker synchronously and persists score — used for "Simular coleta" in UI
  app.post(
    '/monitors/:id/collect',
    { schema: { tags: ['geo'], summary: 'Run GEO collection via AI worker (sync)' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const monitor = await db.query.geoMonitors.findFirst({
        where: and(eq(geoMonitors.id, id), eq(geoMonitors.tenantId, request.user.tid)),
      })

      if (!monitor) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Monitor not found', statusCode: 404 })
      }

      // Call ai-worker mock collect endpoint
      let workerData: {
        overallScore: number
        engineScores: Record<string, number>
        mentions: Array<{
          engine: string
          keyword: string
          mentioned: boolean
          sentiment: string
          positionRank: number | null
        }>
        citedSources?: Array<{
          url: string
          engine: string
        }>
      }

      try {
        const workerRes = await fetch(`${env.AI_WORKER_URL}/api/collect/geo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Worker-Secret': env.AI_WORKER_SECRET,
          },
          body: JSON.stringify({
            monitorId: id,
            tenantId: request.user.tid,
            brandName: monitor.brandName,
            keywords: monitor.keywords,
            engines: monitor.engines,
          }),
        })

        if (!workerRes.ok) {
          const txt = await workerRes.text()
          app.log.error({ status: workerRes.status, body: txt }, 'GEO worker error')
          return reply.status(502).send({ error: 'WORKER_ERROR', message: 'AI Worker unavailable', statusCode: 502 })
        }

        workerData = await workerRes.json() as typeof workerData
      } catch (err) {
        app.log.error({ err }, 'Failed to reach AI Worker')
        return reply.status(503).send({ error: 'WORKER_UNREACHABLE', message: 'AI Worker is not reachable', statusCode: 503 })
      }

      // Upsert today's score
      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const mentionCount = workerData.mentions.filter(m => m.mentioned).length
      const totalMentions = workerData.mentions.length
      const visibilityRate = totalMentions > 0 ? (mentionCount / totalMentions) * 100 : 0

      const positiveCount = workerData.mentions.filter(m => m.mentioned && m.sentiment === 'positive').length
      const mentionedCount = workerData.mentions.filter(m => m.mentioned).length
      const avgSentiment = mentionedCount > 0 ? (positiveCount / mentionedCount) * 100 : 50

      const [score] = await db
        .insert(geoScores)
        .values({
          monitorId: id,
          tenantId: request.user.tid,
          calculatedDate: today,
          totalScore: workerData.overallScore.toString(),
          visibilityRate: visibilityRate.toFixed(2),
          avgSentiment: avgSentiment.toFixed(2),
          byEngine: workerData.engineScores,
        })
        .onConflictDoUpdate({
          target: [geoScores.monitorId, geoScores.calculatedDate],
          set: {
            totalScore: workerData.overallScore.toString(),
            visibilityRate: visibilityRate.toFixed(2),
            avgSentiment: avgSentiment.toFixed(2),
            byEngine: workerData.engineScores,
          },
        })
        .returning()

      // Persist cited sources from worker response (Sprint 5)
      if (workerData.citedSources && workerData.citedSources.length > 0) {
        const sourceRows = workerData.citedSources.map(cs => {
          let domain = cs.url
          try {
            domain = new URL(cs.url).hostname.replace(/^www\./, '')
          } catch {
            // keep raw value if URL parsing fails
          }
          return {
            tenantId: request.user.tid,
            domain,
            fullUrl: cs.url,
            engine: cs.engine,
          }
        })
        await db.insert(geoCitedSources).values(sourceRows)
      }

      return reply.send({
        data: {
          score,
          engineScores: workerData.engineScores,
          overallScore: workerData.overallScore,
          mentionRate: visibilityRate.toFixed(1),
          totalMentions,
          mentionCount,
        },
      })
    }
  )

  // ─── Sprint 2 routes ────────────────────────────────────────────────────────

  // GET /api/v1/geo/dashboard
  app.get(
    '/dashboard',
    { schema: { tags: ['geo'], summary: 'GEO dashboard summary' } },
    async (request, reply) => {
      const tid = request.user.tid

      const [promptsCount] = await db
        .select({ value: count() })
        .from(geoPrompts)
        .where(eq(geoPrompts.tenantId, tid))

      const [competitorsCount] = await db
        .select({ value: count() })
        .from(geoCompetitors)
        .where(eq(geoCompetitors.tenantId, tid))

      const [responsesCount] = await db
        .select({ value: count() })
        .from(geoPromptResults)
        .where(
          sql`${geoPromptResults.promptId} IN (
            SELECT id FROM geo_prompts WHERE tenant_id = ${tid}::uuid
          )`
        )

      const [mentionsCount] = await db
        .select({ value: count() })
        .from(geoPromptResults)
        .where(
          and(
            eq(geoPromptResults.brandMentioned, true),
            sql`${geoPromptResults.promptId} IN (
              SELECT id FROM geo_prompts WHERE tenant_id = ${tid}::uuid
            )`
          )
        )

      const [sentimentAvg] = await db
        .select({ value: avg(geoPromptResults.sentiment) })
        .from(geoPromptResults)
        .where(
          sql`${geoPromptResults.promptId} IN (
            SELECT id FROM geo_prompts WHERE tenant_id = ${tid}::uuid
          )`
        )

      const latestScore = await db.query.geoScores.findFirst({
        where: eq(geoScores.tenantId, tid),
        orderBy: [desc(geoScores.calculatedDate)],
      })

      // Top prompts: highest brand_mentioned rate
      const topPrompts = await db
        .select({
          id: geoPrompts.id,
          promptText: geoPrompts.promptText,
          groupName: geoPrompts.groupName,
          mentionRate: sql<number>`ROUND(
            100.0 * COUNT(CASE WHEN ${geoPromptResults.brandMentioned} = true THEN 1 END)
            / NULLIF(COUNT(${geoPromptResults.id}), 0), 2
          )`,
        })
        .from(geoPrompts)
        .leftJoin(geoPromptResults, eq(geoPromptResults.promptId, geoPrompts.id))
        .where(eq(geoPrompts.tenantId, tid))
        .groupBy(geoPrompts.id)
        .orderBy(sql`4 DESC`)
        .limit(5)

      // Worst prompts: lowest mention rate
      const worstPrompts = await db
        .select({
          id: geoPrompts.id,
          promptText: geoPrompts.promptText,
          groupName: geoPrompts.groupName,
          mentionRate: sql<number>`ROUND(
            100.0 * COUNT(CASE WHEN ${geoPromptResults.brandMentioned} = true THEN 1 END)
            / NULLIF(COUNT(${geoPromptResults.id}), 0), 2
          )`,
        })
        .from(geoPrompts)
        .leftJoin(geoPromptResults, eq(geoPromptResults.promptId, geoPrompts.id))
        .where(eq(geoPrompts.tenantId, tid))
        .groupBy(geoPrompts.id)
        .orderBy(sql`4 ASC NULLS LAST`)
        .limit(5)

      const competitorRanking = await db.query.geoCompetitors.findMany({
        where: eq(geoCompetitors.tenantId, tid),
        orderBy: [desc(geoCompetitors.mentionCount)],
        limit: 10,
      })

      return reply.send({
        data: {
          totalPrompts: Number(promptsCount?.value ?? 0),
          totalCompetitors: Number(competitorsCount?.value ?? 0),
          shareOfVoice: latestScore?.shareOfVoice ?? '0',
          shareOfSource: latestScore?.linkCitationRate ?? '0',
          avgSentiment: sentimentAvg?.value ?? '0',
          totalResponses: Number(responsesCount?.value ?? 0),
          totalMentions: Number(mentionsCount?.value ?? 0),
          topPrompts,
          worstPrompts,
          competitorRanking,
        },
      })
    }
  )

  // GET /api/v1/geo/prompts
  app.get(
    '/prompts',
    { schema: { tags: ['geo'], summary: 'List GEO prompts' } },
    async (request, reply) => {
      const query = request.query as { monitorId?: string; groupName?: string }
      const conditions = [eq(geoPrompts.tenantId, request.user.tid)]
      if (query.monitorId) conditions.push(eq(geoPrompts.monitorId, query.monitorId))
      if (query.groupName) conditions.push(eq(geoPrompts.groupName, query.groupName))

      const prompts = await db.query.geoPrompts.findMany({
        where: and(...conditions),
        orderBy: [desc(geoPrompts.createdAt)],
      })
      return reply.send({ data: prompts })
    }
  )

  // POST /api/v1/geo/prompts
  app.post(
    '/prompts',
    { schema: { tags: ['geo'], summary: 'Create GEO prompt' } },
    async (request, reply) => {
      const body = z.object({
        monitorId: z.string().uuid().optional(),
        promptText: z.string().min(1).max(2000),
        intentCluster: z.string().max(50).optional(),
        groupName: z.string().max(100).optional(),
      }).parse(request.body)

      const [prompt] = await db
        .insert(geoPrompts)
        .values({ ...body, tenantId: request.user.tid })
        .returning()

      return reply.status(201).send({ data: prompt })
    }
  )

  // DELETE /api/v1/geo/prompts/:id
  app.delete(
    '/prompts/:id',
    { schema: { tags: ['geo'], summary: 'Delete GEO prompt' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      await db
        .delete(geoPrompts)
        .where(and(eq(geoPrompts.id, id), eq(geoPrompts.tenantId, request.user.tid)))

      return reply.status(204).send()
    }
  )

  // POST /api/v1/geo/prompts/:id/collect
  app.post(
    '/prompts/:id/collect',
    { schema: { tags: ['geo'], summary: 'Collect AI responses for a prompt' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const prompt = await db.query.geoPrompts.findFirst({
        where: and(eq(geoPrompts.id, id), eq(geoPrompts.tenantId, request.user.tid)),
      })

      if (!prompt) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Prompt not found', statusCode: 404 })
      }

      const body = z.object({
        engines: z.array(z.enum(['chatgpt', 'gemini', 'claude', 'perplexity', 'grok'])).default([
          'chatgpt', 'gemini', 'claude', 'perplexity',
        ]),
      }).parse(request.body ?? {})

      // Enqueue collection job
      await app.redis.lpush('geo:prompt:collect:queue', JSON.stringify({
        promptId: id,
        tenantId: request.user.tid,
        engines: body.engines,
        triggeredAt: new Date().toISOString(),
      }))

      return reply.status(202).send({ data: { message: 'Collection enqueued', promptId: id } })
    }
  )

  // GET /api/v1/geo/prompts/:id/results
  app.get(
    '/prompts/:id/results',
    { schema: { tags: ['geo'], summary: 'Get results for a GEO prompt' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const prompt = await db.query.geoPrompts.findFirst({
        where: and(eq(geoPrompts.id, id), eq(geoPrompts.tenantId, request.user.tid)),
      })

      if (!prompt) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Prompt not found', statusCode: 404 })
      }

      const results = await db.query.geoPromptResults.findMany({
        where: eq(geoPromptResults.promptId, id),
        orderBy: [desc(geoPromptResults.collectedAt)],
      })

      return reply.send({ data: results })
    }
  )

  // GET /api/v1/geo/competitors
  app.get(
    '/competitors',
    { schema: { tags: ['geo'], summary: 'List GEO competitors' } },
    async (request, reply) => {
      const query = request.query as { monitorId?: string }
      const conditions = [eq(geoCompetitors.tenantId, request.user.tid)]
      if (query.monitorId) conditions.push(eq(geoCompetitors.monitorId, query.monitorId))

      const competitors = await db.query.geoCompetitors.findMany({
        where: and(...conditions),
        orderBy: [desc(geoCompetitors.mentionCount)],
      })
      return reply.send({ data: competitors })
    }
  )

  // POST /api/v1/geo/competitors
  app.post(
    '/competitors',
    { schema: { tags: ['geo'], summary: 'Add GEO competitor' } },
    async (request, reply) => {
      const body = z.object({
        monitorId: z.string().uuid().optional(),
        brandName: z.string().min(1).max(200),
        websiteUrl: z.string().max(500).optional(),
      }).parse(request.body)

      const [competitor] = await db
        .insert(geoCompetitors)
        .values({ ...body, tenantId: request.user.tid })
        .returning()

      return reply.status(201).send({ data: competitor })
    }
  )

  // DELETE /api/v1/geo/competitors/:id
  app.delete(
    '/competitors/:id',
    { schema: { tags: ['geo'], summary: 'Remove GEO competitor' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      await db
        .delete(geoCompetitors)
        .where(and(eq(geoCompetitors.id, id), eq(geoCompetitors.tenantId, request.user.tid)))

      return reply.status(204).send()
    }
  )

  // GET /api/v1/geo/action-plans
  app.get(
    '/action-plans',
    { schema: { tags: ['geo'], summary: 'List GEO action plans' } },
    async (request, reply) => {
      const query = request.query as { status?: string }
      const conditions = [eq(geoActionPlans.tenantId, request.user.tid)]
      if (query.status) conditions.push(eq(geoActionPlans.status, query.status))

      const plans = await db.query.geoActionPlans.findMany({
        where: and(...conditions),
        orderBy: [desc(geoActionPlans.createdAt)],
      })
      return reply.send({ data: plans })
    }
  )

  // POST /api/v1/geo/action-plans/generate
  app.post(
    '/action-plans/generate',
    { schema: { tags: ['geo'], summary: 'Generate action plan for a prompt' } },
    async (request, reply) => {
      const body = z.object({
        promptId: z.string().uuid(),
        title: z.string().max(300).optional(),
      }).parse(request.body)

      const prompt = await db.query.geoPrompts.findFirst({
        where: and(
          eq(geoPrompts.id, body.promptId),
          eq(geoPrompts.tenantId, request.user.tid)
        ),
        with: { results: { orderBy: [desc(geoPromptResults.collectedAt)], limit: 10 } },
      })

      if (!prompt) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Prompt not found', statusCode: 404 })
      }

      // Build basic action items from results analysis
      const actions = [
        { type: 'optimize_content', description: `Optimize content for query: "${prompt.promptText}"` },
        { type: 'add_structured_data', description: 'Add FAQ/HowTo structured data to improve AI citations' },
        { type: 'build_topical_authority', description: 'Create supporting content cluster around this topic' },
      ]

      const [plan] = await db
        .insert(geoActionPlans)
        .values({
          tenantId: request.user.tid,
          promptId: body.promptId,
          title: body.title ?? `Action plan for: ${prompt.promptText.slice(0, 60)}`,
          actions,
          status: 'open',
        })
        .returning()

      return reply.status(201).send({ data: plan })
    }
  )

  // PATCH /api/v1/geo/action-plans/:id/archive
  app.patch(
    '/action-plans/:id/archive',
    { schema: { tags: ['geo'], summary: 'Archive GEO action plan' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const [plan] = await db
        .update(geoActionPlans)
        .set({ status: 'archived' })
        .where(and(eq(geoActionPlans.id, id), eq(geoActionPlans.tenantId, request.user.tid)))
        .returning()

      if (!plan) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Action plan not found', statusCode: 404 })
      }

      return reply.send({ data: plan })
    }
  )

  // GET /api/v1/geo/sources
  app.get(
    '/sources',
    { schema: { tags: ['geo'], summary: 'List cited sources aggregated by domain' } },
    async (request, reply) => {
      const query = request.query as { engine?: string }
      const tid = request.user.tid

      const [totalPromptsRow] = await db
        .select({ value: count() })
        .from(geoPrompts)
        .where(eq(geoPrompts.tenantId, tid))
      const totalPrompts = Number(totalPromptsRow?.value ?? 0)

      const conditions = [eq(geoCitedSources.tenantId, tid)]
      if (query.engine) conditions.push(eq(geoCitedSources.engine, query.engine))

      const rows = await db
        .select({
          domain: geoCitedSources.domain,
          pageCount: sql<string>`COUNT(DISTINCT ${geoCitedSources.fullUrl})`,
          promptCount: sql<string>`COUNT(DISTINCT ${geoCitedSources.promptId})`,
          engineCount: sql<string>`COUNT(DISTINCT ${geoCitedSources.engine})`,
        })
        .from(geoCitedSources)
        .where(and(...conditions))
        .groupBy(geoCitedSources.domain)
        .orderBy(sql`COUNT(DISTINCT ${geoCitedSources.promptId}) DESC`)
        .limit(100)

      const data = rows.map(r => ({
        domain: r.domain,
        favicon_url: `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(r.domain)}`,
        page_count: Number(r.pageCount),
        prompt_count: Number(r.promptCount),
        engine_count: Number(r.engineCount),
        impact_pct: totalPrompts > 0
          ? parseFloat(((Number(r.promptCount) / totalPrompts) * 100).toFixed(2))
          : 0,
      }))

      return reply.send({ data })
    }
  )

  // GET /api/v1/geo/pages
  app.get(
    '/pages',
    { schema: { tags: ['geo'], summary: 'List monitored pages' } },
    async (request, reply) => {
      const query = request.query as { monitorId?: string }
      const conditions = [eq(geoMonitoredPages.tenantId, request.user.tid)]
      if (query.monitorId) conditions.push(eq(geoMonitoredPages.monitorId, query.monitorId))

      const pages = await db.query.geoMonitoredPages.findMany({
        where: and(...conditions),
        orderBy: [desc(geoMonitoredPages.citationCount)],
      })
      return reply.send({ data: pages })
    }
  )

  // POST /api/v1/geo/pages
  app.post(
    '/pages',
    { schema: { tags: ['geo'], summary: 'Add monitored page' } },
    async (request, reply) => {
      const body = z.object({
        monitorId: z.string().uuid().optional(),
        pageUrl: z.string().url().max(2000),
      }).parse(request.body)

      const [page] = await db
        .insert(geoMonitoredPages)
        .values({ ...body, tenantId: request.user.tid })
        .returning()

      return reply.status(201).send({ data: page })
    }
  )

  // DELETE /api/v1/geo/pages/:id
  app.delete(
    '/pages/:id',
    { schema: { tags: ['geo'], summary: 'Remove monitored page' } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      await db
        .delete(geoMonitoredPages)
        .where(and(eq(geoMonitoredPages.id, id), eq(geoMonitoredPages.tenantId, request.user.tid)))

      return reply.status(204).send()
    }
  )

  // POST /api/v1/geo/diagnostics/run
  app.post(
    '/diagnostics/run',
    { schema: { tags: ['geo'], summary: 'Run GEO site diagnostic' } },
    async (request, reply) => {
      const body = z.object({
        monitorId: z.string().uuid().optional(),
        targetUrl: z.string().url().max(2000),
      }).parse(request.body)

      // Basic heuristic scoring (production would call AI worker)
      const findings: Array<{ type: string; severity: string; description: string }> = []
      let score = 60

      if (body.targetUrl.startsWith('https://')) {
        score += 5
      } else {
        findings.push({ type: 'no_https', severity: 'high', description: 'Page is not served over HTTPS' })
        score -= 10
      }

      findings.push(
        { type: 'structured_data', severity: 'medium', description: 'Add FAQ/Article structured data to improve AI citations' },
        { type: 'content_depth', severity: 'low', description: 'Ensure comprehensive topic coverage (1500+ words)' }
      )

      const [diagnostic] = await db
        .insert(geoSiteDiagnostics)
        .values({
          tenantId: request.user.tid,
          monitorId: body.monitorId,
          targetUrl: body.targetUrl,
          geoReadinessScore: Math.max(0, Math.min(100, score)),
          findings,
        })
        .returning()

      return reply.status(201).send({ data: diagnostic })
    }
  )

  // GET /api/v1/geo/diagnostics/:monitorId
  app.get(
    '/diagnostics/:monitorId',
    { schema: { tags: ['geo'], summary: 'Get site diagnostics for a monitor' } },
    async (request, reply) => {
      const { monitorId } = request.params as { monitorId: string }

      const diagnostics = await db.query.geoSiteDiagnostics.findMany({
        where: and(
          eq(geoSiteDiagnostics.monitorId, monitorId),
          eq(geoSiteDiagnostics.tenantId, request.user.tid)
        ),
        orderBy: [desc(geoSiteDiagnostics.analyzedAt)],
        limit: 20,
      })

      return reply.send({ data: diagnostics })
    }
  )
}
