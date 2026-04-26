import type { FastifyInstance } from 'fastify'
import { eq, and, ne } from 'drizzle-orm'
import { db, tenants, workspaceMembers, users, userInvitations } from '@ads/db'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.js'
import { createHash } from 'node:crypto'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
})

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
})

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
})

export async function workspacesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)
  const authService = new AuthService(app)

  // GET /api/v1/workspaces — list all workspaces for current user
  app.get('/', async (request, reply) => {
    const workspaces = await authService.getUserWorkspaces(request.user.sub)
    return reply.send({ data: workspaces })
  })

  // POST /api/v1/workspaces — create new workspace
  app.post('/', async (request, reply) => {
    const body = createWorkspaceSchema.parse(request.body)
    const slug = body.slug ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const existingSlug = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) })
    if (existingSlug) return reply.status(409).send({ error: 'SLUG_TAKEN', message: 'Slug já está em uso' })

    const result = await db.transaction(async (tx) => {
      const [tenant] = await tx.insert(tenants).values({
        name: body.name,
        slug,
        plan: 'trial',
        settings: { locale: 'pt-BR', timezone: 'America/Sao_Paulo' },
      }).returning()

      await tx.insert(workspaceMembers).values({
        tenantId: tenant!.id,
        userId: request.user.sub,
        role: 'owner',
      })

      return tenant!
    })

    return reply.status(201).send({ data: { id: result.id, name: result.name, slug: result.slug, role: 'owner', plan: result.plan } })
  })

  // POST /api/v1/workspaces/:id/switch — switch active workspace, returns new JWT
  app.post('/:id/switch', async (request, reply) => {
    const { id } = request.params as { id: string }
    const tokens = await authService.switchWorkspace(request.user.sub, id)
    return reply.send({ data: tokens })
  })

  // GET /api/v1/workspaces/:id/members
  app.get('/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string }

    // Verify requester is a member
    const myMembership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.tenantId, id), eq(workspaceMembers.userId, request.user.sub)),
    })
    if (!myMembership) return reply.status(403).send({ error: 'FORBIDDEN' })

    const members = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.tenantId, id),
      with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true } } },
    })

    // Pending invitations
    const pending = await db.query.userInvitations.findMany({
      where: and(eq(userInvitations.tenantId, id), eq(userInvitations.isAccepted, false)),
    })

    return reply.send({
      data: {
        members: members.map((m) => ({
          id: m.id,
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
          joinedAt: m.joinedAt,
          isCurrentUser: m.userId === request.user.sub,
        })),
        pending: pending.map((p) => ({
          id: p.id,
          email: p.email,
          role: p.role,
          createdAt: p.createdAt,
          expiresAt: p.expiresAt,
        })),
      },
    })
  })

  // POST /api/v1/workspaces/:id/invite — invite user by email
  app.post('/:id/invite', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = inviteSchema.parse(request.body)

    // Verify requester is admin/owner
    const myMembership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.tenantId, id), eq(workspaceMembers.userId, request.user.sub)),
    })
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only admins can invite members' })
    }

    const token = await authService.inviteMember(id, request.user.sub, body.email, body.role)
    const baseUrl = process.env.CORS_ORIGIN ?? 'https://ads.orffia.com'
    const inviteUrl = `${baseUrl}/invite/${token}`

    return reply.status(201).send({ data: { inviteUrl, email: body.email, role: body.role } })
  })

  // DELETE /api/v1/workspaces/:id/invites/:inviteId — cancel pending invite
  app.delete('/:id/invites/:inviteId', async (request, reply) => {
    const { id, inviteId } = request.params as { id: string; inviteId: string }

    // Use JWT role directly — avoid extra DB lookup that can fail for legacy users
    if (!['owner', 'admin'].includes(request.user.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only admins can cancel invites' })
    }
    // Ensure the user is acting within their own workspace
    if (request.user.tid !== id) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Workspace mismatch' })
    }

    const deleted = await db.delete(userInvitations)
      .where(and(eq(userInvitations.id, inviteId), eq(userInvitations.tenantId, id)))
      .returning()

    if (deleted.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Invite not found' })
    }

    return reply.send({ data: { deleted: true } })
  })

  // PATCH /api/v1/workspaces/:id/members/:userId — update member role
  app.patch('/:id/members/:userId', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string }
    const body = updateMemberSchema.parse(request.body)

    const myMembership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.tenantId, id), eq(workspaceMembers.userId, request.user.sub)),
    })
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN' })
    }

    const [updated] = await db.update(workspaceMembers)
      .set({ role: body.role as any })
      .where(and(eq(workspaceMembers.tenantId, id), eq(workspaceMembers.userId, userId)))
      .returning()

    return reply.send({ data: updated })
  })

  // DELETE /api/v1/workspaces/:id/members/:userId — remove member
  app.delete('/:id/members/:userId', async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string }

    const myMembership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.tenantId, id), eq(workspaceMembers.userId, request.user.sub)),
    })
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN' })
    }

    // Cannot remove owner or yourself
    const target = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.tenantId, id), eq(workspaceMembers.userId, userId)),
    })
    if (!target) return reply.status(404).send({ error: 'NOT_FOUND' })
    if (target.role === 'owner') return reply.status(403).send({ error: 'CANNOT_REMOVE_OWNER' })

    await db.delete(workspaceMembers).where(
      and(eq(workspaceMembers.tenantId, id), eq(workspaceMembers.userId, userId))
    )
    return reply.status(204).send()
  })

  // POST /api/v1/workspaces/accept-invite — accept an invite by token
  app.post('/accept-invite', async (request, reply) => {
    const body = z.object({ token: z.string() }).parse(request.body)
    await authService.acceptInvite(body.token, request.user.sub)
    const workspaces = await authService.getUserWorkspaces(request.user.sub)
    return reply.send({ data: { workspaces } })
  })

  // GET /api/v1/workspaces/invite-info/:token — get invite info (public, no auth needed)
  app.get('/invite-info/:token', { config: { skipAuth: true } }, async (request, reply) => {
    const { token } = request.params as { token: string }
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const invitation = await db.query.userInvitations.findFirst({
      where: and(eq(userInvitations.tokenHash, tokenHash), eq(userInvitations.isAccepted, false)),
    })
    if (!invitation || new Date(invitation.expiresAt) < new Date()) {
      return reply.status(404).send({ error: 'INVALID_INVITE' })
    }
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, invitation.tenantId) })
    return reply.send({ data: { email: invitation.email, role: invitation.role, workspaceName: tenant?.name } })
  })
}
