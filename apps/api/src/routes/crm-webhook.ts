/**
 * Generic CRM Webhook — receives lead events from any CRM/form
 * POST /api/v1/webhooks/crm/:tenantId/:secret
 *
 * Payload (all fields optional):
 * {
 *   event?: 'lead' | 'qualified' | 'won' | 'lost',
 *   name?, email?, phone?, company?,
 *   utmSource?, utmMedium?, utmCampaign?, utmContent?, utmTerm?,
 *   gclid?, fbclid?,
 *   value?, mrr?, implantation?,
 *   stageId?, externalId?, meta?
 * }
 *
 * RD Station: configure webhook to POST to this URL.
 * Pipedrive: use Pipedrive webhook → this URL.
 * Any form/landing page: POST JSON directly.
 */
import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, leads, tenants } from '@ads/db'
import { z } from 'zod'
import crypto from 'node:crypto'

const webhookPayloadSchema = z.object({
  event: z.enum(['lead', 'qualified', 'won', 'lost', 'update']).optional().default('lead'),
  externalId: z.string().max(255).optional(),
  name: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  gclid: z.string().max(255).optional(),
  fbclid: z.string().max(255).optional(),
  value: z.number().nonnegative().optional(),
  mrr: z.number().nonnegative().optional(),
  implantation: z.number().nonnegative().optional(),
  stageId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  meta: z.record(z.unknown()).optional().default({}),
})

function mapEventToStatus(event: string): string {
  switch (event) {
    case 'qualified': return 'qualified'
    case 'won': return 'won'
    case 'lost': return 'lost'
    default: return 'new'
  }
}

export async function crmWebhookRoutes(app: FastifyInstance) {

  // POST /api/v1/crm/webhook/:tenantId/:secret
  // No auth required — secret is validated manually
  app.post('/:tenantId/:secret', { config: { skipAuth: true } }, async (request, reply) => {
    const { tenantId, secret } = request.params as { tenantId: string; secret: string }

    // Validate tenant and secret
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) {
      return reply.status(404).send({ error: 'TENANT_NOT_FOUND' })
    }

    // Validate secret: must match HMAC-SHA256 of tenantId with API secret
    const expectedSecret = crypto
      .createHmac('sha256', process.env.JWT_ACCESS_SECRET ?? 'secret')
      .update(tenantId)
      .digest('hex')
      .slice(0, 32)

    if (secret !== expectedSecret) {
      return reply.status(401).send({ error: 'INVALID_SECRET' })
    }

    let body: z.infer<typeof webhookPayloadSchema>
    try {
      body = webhookPayloadSchema.parse(request.body)
    } catch {
      return reply.status(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const { event, value, mrr, implantation, externalId, ...rest } = body

    // Upsert by externalId if provided
    if (externalId) {
      const existing = await db.query.leads.findFirst({
        where: and(eq(leads.tenantId, tenantId), eq(leads.externalId, externalId)),
      })
      if (existing) {
        // Update existing lead
        const [updated] = await db.update(leads)
          .set({
            ...rest,
            status: event === 'update' ? existing.status : (mapEventToStatus(event) as any),
            value: value != null ? String(value) : existing.value,
            mrr: mrr != null ? String(mrr) : existing.mrr,
            implantation: implantation != null ? String(implantation) : existing.implantation,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, existing.id))
          .returning()
        return reply.send({ data: { action: 'updated', id: updated.id } })
      }
    }

    // Create new lead
    const [lead] = await db.insert(leads).values({
      tenantId,
      externalId,
      ...rest,
      status: mapEventToStatus(event) as any,
      value: value != null ? String(value) : undefined,
      mrr: mrr != null ? String(mrr) : undefined,
      implantation: implantation != null ? String(implantation) : undefined,
    }).returning()

    return reply.status(201).send({ data: { action: 'created', id: lead.id } })
  })

  // GET /api/v1/crm/webhook/info — authenticated, returns webhook URL + secret for tenant
  app.get('/info', { preHandler: [app.authenticate] }, async (request, reply) => {
    const tid = request.user.tid
    const secret = crypto
      .createHmac('sha256', process.env.JWT_ACCESS_SECRET ?? 'secret')
      .update(tid)
      .digest('hex')
      .slice(0, 32)

    const baseUrl = process.env.CORS_ORIGIN?.replace('ads.orffia.com', 'api-ads.orffia.com') ?? 'https://api-ads.orffia.com'

    return reply.send({
      data: {
        url: `${baseUrl}/api/v1/crm/webhook/${tid}/${secret}`,
        tenantId: tid,
        secret,
        example: {
          event: 'lead',
          name: 'João Silva',
          email: 'joao@empresa.com',
          phone: '11999999999',
          utmSource: 'google',
          utmCampaign: 'marca-2026',
          gclid: 'abc123',
        },
      },
    })
  })
}
