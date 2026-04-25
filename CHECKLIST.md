# Orffia Ads — Checklist Geral

**Legenda:** ✅ Feito · ❌ Pendente · ⏳ Aguardando dependência externa

---

## Infraestrutura
- ✅ Monorepo Turborepo (API Fastify + Web Next.js 15 + DB Drizzle)
- ✅ Deploy VPS Hostinger com Docker Compose + Traefik
- ✅ Auth JWT (login, registro, refresh token)
- ✅ Arquitetura multi-tenant base

---

## Budget
- ✅ CRUD de budget por plataforma por mês
- ✅ Budget planejado vs gasto + saldo
- ✅ Métricas por mês isoladas (budget.meta por período)
- ✅ Progresso de utilização por conta

---

## Clientes
- ✅ CRUD de clientes
- ✅ Perfil completo (website, setor, telefone, notas)
- ✅ Seletor de cliente no sidebar (filtra todo o painel)

---

## Leads
- ✅ CRUD de leads
- ✅ Status do lead (Novo, Contatado, Qualificado, Ganho, Perdido…)
- ✅ Campos de receita (Valor da Venda, MRR, Implantação, Data de Fechamento)
- ✅ Modal de edição com campos de receita
- ✅ Filtro por status e cliente
- ✅ UTM tracking nos leads (source, medium, campaign, gclid, fbclid)
- ❌ Campo de agendamento (virá do CRM)
- ❌ Separação explícita Lead Ad (formulário nativo) vs LP/Site vs Orgânico

---

## Dashboard
- ✅ KPIs de budget (planejado, gasto, saldo, % utilizado)
- ✅ Métricas de tráfego (impressões, cliques, CTR, CPM, CPC)
- ✅ Total de Leads (CRM + Meta quando CRM vazio)
- ✅ KPIs de receita (Receita Total, Ticket Médio, MRR, Tempo Médio de Fechamento)
- ✅ Pago vs Orgânico com barras de progresso
- ✅ Leads por Segmento/Campanha
- ✅ Navegação por mês/ano
- ❌ Separação Lead Ad vs LP/Site vs Orgânico com contagens isoladas

---

## Relatório
- ✅ Métricas por conta (investido, impressões, cliques, CTR, CPM, CPC, leads, CPL)
- ✅ Budget por plataforma com progresso
- ✅ Funil por etapa com %
- ✅ Top origens de tráfego (UTM)
- ✅ Pago vs Orgânico
- ✅ Leads por Segmento/Campanha
- ✅ KPIs de receita (Receita Total, Ticket Médio, MRR, Tempo Médio de Fechamento)
- ❌ Breakdown por campanha / grupo de anúncio / anúncio
- ❌ Separação Lead Ad vs LP/Site vs Orgânico no relatório
- ❌ Agendamentos no relatório

---

## Integrações — Meta Ads
- ✅ OAuth + seleção de contas
- ✅ Sync gasto, impressões, cliques, CTR, CPM, CPC
- ✅ Contagem de leads via unique_actions (deduplificado, igual Meta Ads Manager)
- ❌ Separação Lead Ad (formulário nativo) vs LP/Site (pixel)
- ❌ Breakdown por campanha / grupo / anúncio no relatório

---

## Integrações — Google Ads
- ✅ OAuth flow
- ✅ Setup de Customer ID
- ⏳ Sync completo (aguardando aprovação de Developer Token — 1-3 dias úteis)

---

## Integrações — HubSpot CRM
- ✅ OAuth flow
- ✅ Sync de contatos → leads
- ✅ Sync de deals → campos de receita nos leads
- ✅ Mapeamento de pipeline HubSpot → funil interno
- ❌ Agendamentos puxados do CRM

---

## Integrações — Webhook Universal (RD Station, Pipedrive, etc.)
- ✅ Endpoint com validação HMAC
- ✅ Upsert por externalId
- ✅ UI com URL do webhook + documentação inline

---

## Google Sheets
- ✅ OAuth + setup UI
- ✅ Mapeamento de campos com colunas (A, B, C…)
- ✅ Campos de receita no mapeamento
- ✅ Sync completo (limpa e reescreve a aba)
- ❌ Multi-aba: escolher campos diferentes por aba livremente

---

## Funil
- ✅ CRUD de etapas do funil
- ✅ Leads por etapa no dashboard e relatório
- ✅ Mapeamento de etapas HubSpot → funil interno

---

## UTM
- ✅ Rastreamento de UTMs nos leads
- ✅ Dicionário de UTMs (rótulos humanos para valores de campanha)
- ✅ Top origens no relatório

---

## Conversões Offline
- ✅ Registro de conversões offline
- ⏳ Envio para Meta CAPI (implementação pendente)
- ⏳ Envio para Google Enhanced Conversions (implementação pendente)

---

## Multi-workspace + Permissões (modelo Mlabs)
- ❌ Workspace por cliente isolado (cada cliente = workspace independente)
- ❌ Usuário com acesso a múltiplos workspaces
- ❌ Convite por workspace com permissão isolada
- ❌ Roles (admin, membro)
