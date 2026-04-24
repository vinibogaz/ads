import type { FastifyInstance } from 'fastify'
import { eq, and, sql } from 'drizzle-orm'
import { db, budgets, leads, offlineConversions, funnelStages, adsPlatformIntegrations, crmIntegrations } from '@ads/db'

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/dashboard/summary?month=4&year=2026&clientId=xxx
  app.get('/summary', async (request, reply) => {
    const query = request.query as { month?: string; year?: string; clientId?: string }
    const now = new Date()
    const month = query.month ? parseInt(query.month) : now.getMonth() + 1
    const year = query.year ? parseInt(query.year) : now.getFullYear()
    const tid = request.user.tid
    const clientId = query.clientId || null

    const budgetWhere = clientId
      ? and(eq(budgets.tenantId, tid), eq(budgets.month, month), eq(budgets.year, year), eq(budgets.clientId, clientId))
      : and(eq(budgets.tenantId, tid), eq(budgets.month, month), eq(budgets.year, year))

    const leadsWhere = clientId
      ? and(eq(leads.tenantId, tid), eq(leads.clientId, clientId))
      : eq(leads.tenantId, tid)

    const [budgetRows, leadRows, conversionRows, stageRows, platformCount, crmCount] =
      await Promise.all([
        db.query.budgets.findMany({ where: budgetWhere }),
        db.select({
          status: leads.status,
          count: sql<number>`count(*)::int`,
        })
          .from(leads)
          .where(leadsWhere)
          .groupBy(leads.status),
        db.select({
          platform: offlineConversions.platform,
          count: sql<number>`count(*)::int`,
        })
          .from(offlineConversions)
          .where(and(eq(offlineConversions.tenantId, tid), eq(offlineConversions.status, 'active')))
          .groupBy(offlineConversions.platform),
        db.select({
          stageId: leads.stageId,
          stageName: funnelStages.name,
          count: sql<number>`count(*)::int`,
        })
          .from(leads)
          .leftJoin(funnelStages, eq(leads.stageId, funnelStages.id))
          .where(leadsWhere)
          .groupBy(leads.stageId, funnelStages.name),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(adsPlatformIntegrations)
          .where(and(eq(adsPlatformIntegrations.tenantId, tid), eq(adsPlatformIntegrations.status, 'active'))),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(crmIntegrations)
          .where(and(eq(crmIntegrations.tenantId, tid), eq(crmIntegrations.status, 'active'))),
      ])

    const totalPlanned = budgetRows.reduce((s, b) => s + parseFloat(b.plannedAmount), 0)
    const totalSpent = budgetRows.reduce((s, b) => s + parseFloat(b.spentAmount), 0)
    const totalLeads = leadRows.reduce((s, r) => s + r.count, 0)
    const qualifiedLeads = leadRows.find((r) => r.status === 'qualified')?.count ?? 0
    const wonLeads = leadRows.find((r) => r.status === 'won')?.count ?? 0
    const totalConversions = conversionRows.reduce((s, r) => s + r.count, 0)

    // Fetch integrations for budget rows — get name + meta (impressions/clicks/CTR)
    const integrationIds = budgetRows.map((b) => b.integrationId).filter(Boolean) as string[]
    const integrationRows = integrationIds.length > 0
      ? await db.query.adsPlatformIntegrations.findMany({
          where: (t, { inArray }) => inArray(t.id, integrationIds),
          columns: { id: true, name: true, meta: true },
        })
      : []
    const integrationMap = Object.fromEntries(integrationRows.map((i) => [i.id, i]))

    // Aggregate metrics from all synced integrations
    const totalImpressions = integrationRows.reduce((s, i) => s + ((i.meta as any)?.impressions ?? 0), 0)
    const totalClicks = integrationRows.reduce((s, i) => s + ((i.meta as any)?.clicks ?? 0), 0)
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgCpm = totalSpent > 0 && totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0
    const cpl = totalLeads > 0 && totalSpent > 0 ? totalSpent / totalLeads : 0

    const budgetByPlatform = budgetRows.map((b) => {
      const planned = parseFloat(b.plannedAmount)
      const spent = parseFloat(b.spentAmount)
      const integration = b.integrationId ? integrationMap[b.integrationId] : null
      const meta = (integration?.meta as any) ?? {}
      return {
        id: b.id,
        platform: b.platform,
        integrationId: b.integrationId ?? null,
        integrationName: integration?.name ?? null,
        plannedAmount: planned,
        spentAmount: spent,
        remainingAmount: planned - spent,
        percentUsed: planned > 0 ? Math.round((spent / planned) * 100) : 0,
        currency: b.currency,
        month,
        year,
        impressions: meta.impressions ?? 0,
        clicks: meta.clicks ?? 0,
        ctr: meta.ctr ?? 0,
        cpm: meta.cpm ?? 0,
        leads: meta.leads ?? 0,
        cpl: meta.cpl ?? 0,
      }
    })

    return reply.send({
      data: {
        period: { month, year },
        totalBudgetPlanned: totalPlanned,
        totalBudgetSpent: totalSpent,
        totalLeads,
        totalQualifiedLeads: qualifiedLeads,
        totalWon: wonLeads,
        totalConversionsSent: totalConversions,
        totalImpressions,
        totalClicks,
        avgCtr: Math.round(avgCtr * 100) / 100,
        avgCpm: Math.round(avgCpm * 100) / 100,
        cpl: Math.round(cpl * 100) / 100,
        activePlatforms: platformCount[0]?.count ?? 0,
        activeCrms: crmCount[0]?.count ?? 0,
        conversionsByPlatform: conversionRows.map((r) => ({ platform: r.platform, count: r.count })),
        leadsByStage: stageRows.map((r) => ({ stageName: r.stageName ?? 'Sem etapa', count: r.count })),
        budgetByPlatform,
      },
    })
  })
}
