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
- ⏳ Separação Lead Ad vs LP/Site vs Orgânico — Lead Ad funcionando, LP/Site usando unique_actions (pendente validação após sync)

---

## Dashboard
- ✅ KPIs de budget (planejado, gasto, saldo, % utilizado)
- ✅ Métricas de tráfego (impressões, cliques, CTR, CPM, CPC)
- ✅ Total de Leads (CRM + Meta quando CRM vazio)
- ✅ KPIs de receita (Receita Total, Ticket Médio, MRR, Tempo Médio de Fechamento)
- ✅ Pago vs Orgânico com barras de progresso
- ✅ Leads por Segmento/Campanha
- ✅ Navegação por mês/ano
- ✅ Seção "Origem dos Leads" com barras (Lead Ad / LP/Site / Orgânico)
- ⏳ LP/Site com número correto (pendente validação) — botão sync sumiu (pendente investigação)

---

## Relatório
- ✅ Métricas por conta (investido, impressões, cliques, CTR, CPM, CPC, leads, CPL)
- ✅ Colunas Lead Ad e LP/Site separadas na tabela de métricas
- ✅ Budget por plataforma com progresso
- ✅ Funil por etapa com %
- ✅ Top origens de tráfego (UTM)
- ✅ Pago vs Orgânico
- ✅ Leads por Segmento/Campanha
- ✅ KPIs de receita (Receita Total, Ticket Médio, MRR, Tempo Médio de Fechamento)
- ❌ Breakdown por campanha / grupo de anúncio / anúncio
- ❌ Agendamentos no relatório

---

## Integrações — Meta Ads
- ✅ OAuth + seleção de contas
- ✅ Sync gasto, impressões, cliques, CTR, CPM, CPC
- ✅ Lead Ad count via unique_actions (deduplificado, igual Meta Ads Manager "Resultados")
- ⏳ LP/Site via unique_actions.offsite_conversion.fb_pixel_lead (pendente validação número correto)
- ⏳ Botão sync sumiu de algum lugar na UI (pendente investigação)
- ❌ Breakdown por campanha / grupo / anúncio no relatório

---

## Integrações — Google Ads
- ✅ OAuth flow
- ✅ Setup de Customer ID
- ⏳ Sync completo (aguardando aprovação de Developer Token — 1-3 dias úteis)

---

## Integrações — HubSpot CRM
- ✅ Conexão via Private App token (funciona agora para todos os clientes)
- ✅ Sync completo com paginação (todos os contatos, sem limite de 100)
- ✅ Deduplicação por externalId + email (sem leads duplicados)
- ✅ Mapeamento de lifecycle stage → status do lead
- ✅ Sync de deals → receita, MRR, data de fechamento, status
- ✅ Mapeamento de pipeline HubSpot → funil interno
- ❌ OAuth automático (mais fácil para clientes não técnicos — precisa de Client ID/Secret no .env)
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
- ✅ Multi-aba: configurar campos diferentes por aba livremente (+ Adicionar aba)
- ✅ Header em português na planilha
- ✅ Sync de múltiplas abas em paralelo
- ⏳ Validar fluxo: URL → carrega abas automaticamente → configurar → salvar (pendente validação)

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
- ✅ Workspace por cliente isolado (cada cliente = workspace independente)
- ✅ Usuário com acesso a múltiplos workspaces + seletor no sidebar
- ✅ Convite por workspace com link de 7 dias (cópia manual)
- ✅ Roles (Proprietário, Admin, Editor, Visualizador)
- ✅ Criar novo workspace
- ✅ Página de membros (/settings/members)
- ✅ Aceitar convite via link (/invite/[token])
- ✅ Novo usuário aceita convite ao criar conta (RegisterForm processa ?invite=token)
- ✅ Cancelar convite pendente
- ❌ Envio automático de e-mail ao convidar (SMTP — Resend/SendGrid/Mailgun)
