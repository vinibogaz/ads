import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, googleSheetsIntegrations, leads } from '@ads/db'
import { z } from 'zod'
import { getValidGoogleToken } from './google-oauth.js'

const LEAD_FIELDS = ['name', 'email', 'phone', 'company', 'status', 'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm', 'createdAt'] as const

const completeSetupSchema = z.object({
  name: z.string().min(1).max(255),
  spreadsheetId: z.string().min(1),
  sheetName: z.string().min(1).default('Sheet1'),
  spreadsheetTitle: z.string().optional(),
  clientId: z.string().uuid().optional(),
  fieldMapping: z.record(z.string()).optional(),
})

// Clear and overwrite a sheet range
async function clearAndWriteSheet(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  values: string[][]
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A:Z`)
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const writeRange = encodeURIComponent(`${sheetName}!A1`)
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(err.error?.message ?? 'Failed to write to sheet')
  }
}

function buildLeadRows(leadRows: any[], fieldMapping: Record<string, string>): string[][] {
  const sortedFields = Object.entries(fieldMapping).sort((a, b) => a[1].localeCompare(b[1]))
  const header = sortedFields.map(([field]) => field)
  const rows = leadRows.map((lead) =>
    sortedFields.map(([field]) => {
      const val = (lead as any)[field]
      if (val instanceof Date) return val.toLocaleString('pt-BR')
      return val?.toString() ?? ''
    })
  )
  return [header, ...rows]
}

const DEFAULT_FIELD_MAPPING = {
  name: 'A', email: 'B', phone: 'C', company: 'D',
  status: 'E', utmSource: 'F', utmMedium: 'G', utmCampaign: 'H', createdAt: 'I',
}

export async function googleSheetsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/google-sheets
  app.get('/', async (request, reply) => {
    const rows = await db.query.googleSheetsIntegrations.findMany({
      where: eq(googleSheetsIntegrations.tenantId, request.user.tid),
      orderBy: (g, { asc }) => [asc(g.name)],
    })
    return reply.send({
      data: rows.map((r) => ({
        ...r,
        credentials: undefined, // never expose tokens to frontend
      })),
    })
  })

  // PATCH /api/v1/google-sheets/:id — complete setup after OAuth or update settings
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = completeSetupSchema.partial().parse(request.body)

    const existing = await db.query.googleSheetsIntegrations.findFirst({
      where: and(eq(googleSheetsIntegrations.id, id), eq(googleSheetsIntegrations.tenantId, request.user.tid)),
    })
    if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Integration not found' })

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name) updateData.name = body.name
    if (body.spreadsheetId) updateData.spreadsheetId = body.spreadsheetId
    if (body.sheetName) updateData.sheetName = body.sheetName
    if (body.spreadsheetTitle) updateData.spreadsheetTitle = body.spreadsheetTitle
    if (body.fieldMapping) updateData.fieldMapping = body.fieldMapping
    if (body.clientId !== undefined) updateData.clientId = body.clientId
    // Activate if spreadsheetId is being set
    if (body.spreadsheetId && existing.status === 'pending') updateData.status = 'active'

    const [updated] = await db.update(googleSheetsIntegrations)
      .set(updateData)
      .where(eq(googleSheetsIntegrations.id, id))
      .returning()

    return reply.send({ data: { ...updated, credentials: undefined } })
  })

  // DELETE /api/v1/google-sheets/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await db.query.googleSheetsIntegrations.findFirst({
      where: and(eq(googleSheetsIntegrations.id, id), eq(googleSheetsIntegrations.tenantId, request.user.tid)),
    })
    if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Integration not found' })
    await db.delete(googleSheetsIntegrations).where(eq(googleSheetsIntegrations.id, id))
    return reply.status(204).send()
  })

  // POST /api/v1/google-sheets/:id/sync — full sync of leads to sheet
  app.post('/:id/sync', async (request, reply) => {
    const { id } = request.params as { id: string }

    const integration = await db.query.googleSheetsIntegrations.findFirst({
      where: and(eq(googleSheetsIntegrations.id, id), eq(googleSheetsIntegrations.tenantId, request.user.tid)),
    })
    if (!integration) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Integration not found' })
    if (!integration.spreadsheetId) return reply.status(400).send({ error: 'NOT_CONFIGURED', message: 'Complete o setup antes de sincronizar' })

    let token: string
    try {
      token = await getValidGoogleToken(id, request.user.tid)
    } catch (e: any) {
      return reply.status(400).send({ error: 'TOKEN_ERROR', message: e.message })
    }

    const leadsWhere = integration.clientId
      ? and(eq(leads.tenantId, request.user.tid), eq(leads.clientId, integration.clientId))
      : eq(leads.tenantId, request.user.tid)

    const leadRows = await db.query.leads.findMany({
      where: leadsWhere,
      orderBy: (l, { desc }) => [desc(l.createdAt)],
    })

    try {
      const fieldMapping = (integration.fieldMapping as Record<string, string>) ?? DEFAULT_FIELD_MAPPING
      const rows = buildLeadRows(leadRows, fieldMapping)
      await clearAndWriteSheet(token, integration.spreadsheetId, integration.sheetName, rows)

      await db.update(googleSheetsIntegrations)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(googleSheetsIntegrations.id, id))

      return reply.send({ data: { synced: leadRows.length, spreadsheetId: integration.spreadsheetId } })
    } catch (e: any) {
      app.log.error({ err: e.message, id }, 'Google Sheets sync failed')
      return reply.status(502).send({ error: 'SYNC_FAILED', message: e.message ?? 'Sync failed' })
    }
  })

  // GET /api/v1/google-sheets/fields — available lead fields for mapping
  app.get('/fields', async (_request, reply) => {
    return reply.send({
      data: LEAD_FIELDS.map((f) => ({
        field: f,
        label: {
          name: 'Nome', email: 'E-mail', phone: 'Telefone', company: 'Empresa',
          status: 'Status', utmSource: 'UTM Source', utmMedium: 'UTM Medium',
          utmCampaign: 'UTM Campaign', utmContent: 'UTM Content', utmTerm: 'UTM Term',
          createdAt: 'Data de criação',
        }[f] ?? f,
      })),
    })
  })
}
