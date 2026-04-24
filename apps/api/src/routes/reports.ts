import type { FastifyInstance } from 'fastify'
import { eq, and, sql } from 'drizzle-orm'
import { db, budgets, leads, funnelStages, adsPlatformIntegrations, offlineConversions, utmEntries, clients } from '@ads/db'

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/v1/reports/marketing?month=4&year=2026&clientId=xxx
  app.get('/marketing', async (request, reply) => {
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

    const integrationsWhere = clientId
      ? and(eq(adsPlatformIntegrations.tenantId, tid), eq(adsPlatformIntegrations.status, 'active'), eq(adsPlatformIntegrations.clientId, clientId))
      : and(eq(adsPlatformIntegrations.tenantId, tid), eq(adsPlatformIntegrations.status, 'active'))

    const [budgetRows, leadRows, stageRows, integrationRows, conversionRows, utmRows, clientRow] =
      await Promise.all([
        db.query.budgets.findMany({ where: budgetWhere }),
        db.select({ status: leads.status, count: sql<number>`count(*)::int` })
          .from(leads).where(leadsWhere).groupBy(leads.status),
        db.select({
          stageName: funnelStages.name,
          isWon: funnelStages.isWon,
          isLost: funnelStages.isLost,
          count: sql<number>`count(*)::int`,
        })
          .from(leads)
          .leftJoin(funnelStages, eq(leads.stageId, funnelStages.id))
          .where(leadsWhere)
          .groupBy(funnelStages.name, funnelStages.isWon, funnelStages.isLost),
        db.query.adsPlatformIntegrations.findMany({
          where: integrationsWhere,
          columns: { id: true, name: true, platform: true, accountId: true, meta: true, lastSyncAt: true },
        }),
        db.select({ platform: offlineConversions.platform, count: sql<number>`count(*)::int` })
          .from(offlineConversions)
          .where(and(eq(offlineConversions.tenantId, tid), eq(offlineConversions.status, 'active')))
          .groupBy(offlineConversions.platform),
        db.select({
          source: utmEntries.source,
          medium: utmEntries.medium,
          campaign: utmEntries.campaign,
          hits: utmEntries.hitCount,
        })
          .from(utmEntries)
          .where(eq(utmEntries.tenantId, tid))
          .orderBy(sql`hit_count DESC`)
          .limit(10),
        clientId
          ? db.query.clients.findFirst({ where: and(eq(clients.id, clientId), eq(clients.tenantId, tid)) })
          : Promise.resolve(null),
      ])

    const totalPlanned = budgetRows.reduce((s, b) => s + parseFloat(b.plannedAmount), 0)
    const totalSpent = budgetRows.reduce((s, b) => s + parseFloat(b.spentAmount), 0)
    const totalLeads = leadRows.reduce((s, r) => s + r.count, 0)
    const qualifiedLeads = leadRows.find((r) => r.status === 'qualified')?.count ?? 0
    const wonLeads = leadRows.find((r) => r.status === 'won')?.count ?? 0
    const cpl = totalLeads > 0 && totalSpent > 0 ? totalSpent / totalLeads : 0
    const cpa = wonLeads > 0 && totalSpent > 0 ? totalSpent / wonLeads : 0
    const qualificationRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0
    const closeRate = qualifiedLeads > 0 ? (wonLeads / qualifiedLeads) * 100 : 0
    const budgetUsagePct = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0

    // Per-integration metrics from meta field
    const integrationMetrics = integrationRows.map((i) => {
      const meta = (i.meta as any) ?? {}
      const budget = budgetRows.find((b) => b.integrationId === i.id)
      return {
        id: i.id,
        name: i.name,
        platform: i.platform,
        accountId: i.accountId,
        lastSyncAt: i.lastSyncAt,
        spend: budget ? parseFloat(budget.spentAmount) : 0,
        planned: budget ? parseFloat(budget.plannedAmount) : 0,
        impressions: meta.impressions ?? 0,
        clicks: meta.clicks ?? 0,
        leads: meta.leads ?? 0,
        ctr: meta.ctr ?? 0,
        cpm: meta.cpm ?? 0,
        cpl: meta.cpl ?? 0,
        currency: budget?.currency ?? 'BRL',
      }
    })

    const budgetByPlatform = budgetRows.map((b) => {
      const planned = parseFloat(b.plannedAmount)
      const spent = parseFloat(b.spentAmount)
      const integration = integrationRows.find((i) => i.id === b.integrationId)
      return {
        id: b.id,
        platform: b.platform,
        integrationName: integration?.name ?? null,
        plannedAmount: planned,
        spentAmount: spent,
        remainingAmount: planned - spent,
        percentUsed: planned > 0 ? Math.round((spent / planned) * 100) : 0,
        currency: b.currency,
      }
    })

    return reply.send({
      data: {
        client: clientRow ?? null,
        period: { month, year },
        summary: {
          totalBudgetPlanned: totalPlanned,
          totalBudgetSpent: totalSpent,
          totalBudgetRemaining: totalPlanned - totalSpent,
          budgetUsagePct: Math.round(budgetUsagePct * 10) / 10,
          totalLeads,
          qualifiedLeads,
          wonLeads,
          cpl: Math.round(cpl * 100) / 100,
          cpa: Math.round(cpa * 100) / 100,
          qualificationRate: Math.round(qualificationRate * 10) / 10,
          closeRate: Math.round(closeRate * 10) / 10,
          totalConversionsSent: conversionRows.reduce((s, r) => s + r.count, 0),
        },
        budgetByPlatform,
        integrationMetrics,
        leadsByStage: stageRows.map((s) => ({
          stageName: s.stageName ?? 'Sem etapa',
          count: s.count,
          isWon: s.isWon,
          isLost: s.isLost,
          pct: totalLeads > 0 ? Math.round((s.count / totalLeads) * 100) : 0,
        })),
        conversionsByPlatform: conversionRows,
        topUtmSources: utmRows.map((u) => ({
          source: u.source,
          medium: u.medium,
          campaign: u.campaign,
          hits: u.hits,
        })),
      },
    })
  })
}
