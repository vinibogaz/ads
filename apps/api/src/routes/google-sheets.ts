import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, googleSheetsIntegrations, leads, funnelStages } from '@ads/db'
import { z } from 'zod'
import { createSign } from 'node:crypto'

const LEAD_FIELDS = ['name', 'email', 'phone', 'company', 'status', 'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm', 'createdAt'] as const

const createGSheetsSchema = z.object({
  name: z.string().min(1).max(255),
  spreadsheetId: z.string().min(1),
  sheetName: z.string().min(1).default('Sheet1'),
  clientId: z.string().uuid().optional(),
  fieldMapping: z.record(z.string()).default({
    name: 'A', email: 'B', phone: 'C', company: 'D',
    status: 'E', utmSource: 'F', utmMedium: 'G', utmCampaign: 'H', createdAt: 'I',
  }),
  serviceAccountJson: z.string().min(1),
})

// Get Google OAuth2 access token from service account
async function getServiceAccountToken(serviceAccountJson: string, scopes: string[]): Promise<string> {
  const sa = JSON.parse(serviceAccountJson)
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signingInput = `${header}.${body}`
  const sign = createSign('RSA-SHA256')
  sign.update(signingInput)
  const signature = sign.sign(sa.private_key, 'base64url')
  const jwt = `${signingInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(err.error_description ?? 'Failed to get Google access token')
  }
  const data = await res.json() as { access_token: string }
  return data.access_token
}

// Append rows to Google Sheet
async function appendToSheet(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  values: string[][]
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A1`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(err.error?.message ?? 'Failed to append to sheet')
  }
}

// Clear and overwrite a range
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

export async function googleSheetsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/google-sheets
  app.get('/', async (request, reply) => {
    const rows = await db.query.googleSheetsIntegrations.findMany({
      where: eq(googleSheetsIntegrations.tenantId, request.user.tid),
      orderBy: (g, { asc }) => [asc(g.name)],
    })
    return reply.send({ data: rows.map((r) => ({ ...r, credentials: undefined })) })
  })

  // POST /api/v1/google-sheets — connect a sheet
  app.post('/', async (request, reply) => {
    const body = createGSheetsSchema.parse(request.body)

    // Test connection before saving
    try {
      const token = await getServiceAccountToken(body.serviceAccountJson, ['https://www.googleapis.com/auth/spreadsheets'])
      // Try to read spreadsheet metadata
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${body.spreadsheetId}?fields=spreadsheetId,properties.title`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!metaRes.ok) {
        return reply.status(400).send({ error: 'SHEET_ACCESS_FAILED', message: 'Não foi possível acessar a planilha. Verifique se a conta de serviço tem acesso.' })
      }
    } catch (e: any) {
      return reply.status(400).send({ error: 'CREDENTIALS_INVALID', message: e.message ?? 'Credenciais inválidas' })
    }

    const [row] = await db.insert(googleSheetsIntegrations).values({
      tenantId: request.user.tid,
      clientId: body.clientId ?? null,
      name: body.name,
      spreadsheetId: body.spreadsheetId,
      sheetName: body.sheetName,
      fieldMapping: body.fieldMapping,
      credentials: { serviceAccountJson: body.serviceAccountJson },
      status: 'active',
    }).returning()

    return reply.status(201).send({ data: { ...row, credentials: undefined } })
  })

  // PATCH /api/v1/google-sheets/:id
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createGSheetsSchema.omit({ serviceAccountJson: true }).extend({
      serviceAccountJson: z.string().optional(),
    }).partial().parse(request.body)

    const existing = await db.query.googleSheetsIntegrations.findFirst({
      where: and(eq(googleSheetsIntegrations.id, id), eq(googleSheetsIntegrations.tenantId, request.user.tid)),
    })
    if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Integration not found' })

    const updateData: any = { updatedAt: new Date() }
    if (body.name) updateData.name = body.name
    if (body.spreadsheetId) updateData.spreadsheetId = body.spreadsheetId
    if (body.sheetName) updateData.sheetName = body.sheetName
    if (body.fieldMapping) updateData.fieldMapping = body.fieldMapping
    if (body.clientId !== undefined) updateData.clientId = body.clientId
    if (body.serviceAccountJson) updateData.credentials = { serviceAccountJson: body.serviceAccountJson }

    const [updated] = await db.update(googleSheetsIntegrations).set(updateData).where(eq(googleSheetsIntegrations.id, id)).returning()
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

    const creds = integration.credentials as { serviceAccountJson?: string }
    if (!creds.serviceAccountJson) {
      return reply.status(400).send({ error: 'NO_CREDENTIALS', message: 'Service account not configured' })
    }

    const leadsWhere = integration.clientId
      ? and(eq(leads.tenantId, request.user.tid), eq(leads.clientId, integration.clientId))
      : eq(leads.tenantId, request.user.tid)

    const leadRows = await db.query.leads.findMany({
      where: leadsWhere,
      orderBy: (l, { desc }) => [desc(l.createdAt)],
    })

    try {
      const token = await getServiceAccountToken(creds.serviceAccountJson, ['https://www.googleapis.com/auth/spreadsheets'])
      const fieldMapping = integration.fieldMapping as Record<string, string>
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
          name: 'Nome',
          email: 'E-mail',
          phone: 'Telefone',
          company: 'Empresa',
          status: 'Status',
          utmSource: 'UTM Source',
          utmMedium: 'UTM Medium',
          utmCampaign: 'UTM Campaign',
          utmContent: 'UTM Content',
          utmTerm: 'UTM Term',
          createdAt: 'Data de criação',
        }[f] ?? f,
      })),
    })
  })
}
