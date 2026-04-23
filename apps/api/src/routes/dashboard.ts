import type { FastifyInstance } from 'fastify'
import { eq, and, sql, count } from 'drizzle-orm'
import { db, budgets, leads, offlineConversions, funnelStages, adsPlatformIntegrations, crmIntegrations } from '@ads/db'

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/dashboard/summary?month=4&year=2026
  app.get('/summary', async (request, reply) => {
    const query = request.query as { month?: string; year?: string }
    const now = new Date()
    const month = query.month ? parseInt(query.month) : now.getMonth() + 1
    const year = query.year ? parseInt(query.year) : now.getFullYear()
    const tid = request.user.tid

    const [budgetRows, leadRows, conversionRows, stageRows, platformCount, crmCount] =
      await Promise.all([
        db.query.budgets.findMany({
          where: and(eq(budgets.tenantId, tid), eq(budgets.month, month), eq(budgets.year, year)),
        }),
        db.select({
          status: leads.status,
          count: sql<number>`count(*)::int`,
        })
          .from(leads)
          .where(eq(leads.tenantId, tid))
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
          .where(eq(leads.tenantId, tid))
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

    // Fetch integration names for budget rows that have integrationId
    const integrationIds = budgetRows.map((b) => b.integrationId).filter(Boolean) as string[]
    const integrationRows = integrationIds.length > 0
      ? await db.query.adsPlatformIntegrations.findMany({
          where: (t, { inArray }) => inArray(t.id, integrationIds),
          columns: { id: true, name: true },
        })
      : []
    const integrationMap = Object.fromEntries(integrationRows.map((i) => [i.id, i.name]))

    const budgetByPlatform = budgetRows.map((b) => {
      const planned = parseFloat(b.plannedAmount)
      const spent = parseFloat(b.spentAmount)
      return {
        id: b.id,
        platform: b.platform,
        integrationId: b.integrationId ?? null,
        integrationName: b.integrationId ? (integrationMap[b.integrationId] ?? null) : null,
        plannedAmount: planned,
        spentAmount: spent,
        remainingAmount: planned - spent,
        percentUsed: planned > 0 ? Math.round((spent / planned) * 100) : 0,
        currency: b.currency,
        month,
        year,
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
        activePlatforms: platformCount[0]?.count ?? 0,
        activeCrms: crmCount[0]?.count ?? 0,
        conversionsByPlatform: conversionRows.map((r) => ({ platform: r.platform, count: r.count })),
        leadsByStage: stageRows.map((r) => ({ stageName: r.stageName ?? 'Sem etapa', count: r.count })),
        budgetByPlatform,
      },
    })
  })
}
