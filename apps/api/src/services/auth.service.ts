import { eq, and } from 'drizzle-orm'
import * as argon2 from 'argon2'
import { createHash, randomBytes } from 'crypto'
import { db, users, tenants, refreshTokens, passwordResetTokens, workspaceMembers, userInvitations } from '@ads/db'
import type { AuthTokens, JwtPayload, UserRole } from '@ads/shared'
import type { FastifyInstance } from 'fastify'

const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000 // 15 min
const REFRESH_TOKEN_EXPIRY_DAYS = 7

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async register(data: {
    email: string
    password: string
    name: string
    tenantName: string
    tenantSlug?: string
  }): Promise<AuthTokens> {
    const slug =
      data.tenantSlug ??
      data.tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

    // Check email uniqueness
    const existing = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    })
    if (existing) {
      throw { statusCode: 409, code: 'EMAIL_TAKEN', message: 'Email already in use' }
    }

    // Check slug uniqueness
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    })
    if (existingTenant) {
      throw { statusCode: 409, code: 'SLUG_TAKEN', message: 'Workspace slug already taken' }
    }

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })

    // Create tenant + owner user + workspace membership atomically
    const result = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: data.tenantName,
          slug,
          plan: 'trial',
          settings: { locale: 'pt-BR', timezone: 'America/Sao_Paulo' },
        })
        .returning()

      const [user] = await tx
        .insert(users)
        .values({
          tenantId: tenant!.id,
          email: data.email.toLowerCase(),
          name: data.name,
          passwordHash,
          role: 'owner',
          status: 'active',
        })
        .returning()

      // Create workspace membership for owner
      await tx.insert(workspaceMembers).values({
        tenantId: tenant!.id,
        userId: user!.id,
        role: 'owner',
      })

      return { tenant: tenant!, user: user! }
    })

    return this.generateTokenPair(result.user.id, result.tenant.id, result.user.role)
  }

  async login(email: string, password: string): Promise<AuthTokens & { workspaces: { id: string; name: string; slug: string; role: string }[] }> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    })

    if (!user || user.status !== 'active') {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    }

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    }

    // Get all workspaces this user belongs to
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.userId, user.id),
      with: { tenant: true },
    })

    // If no workspace_members entries yet (legacy user), fall back to users.tenantId
    let activeWorkspaces = memberships
      .filter((m) => m.tenant?.status === 'active')
      .map((m) => ({ id: m.tenantId, name: m.tenant!.name, slug: m.tenant!.slug, role: m.role }))

    if (activeWorkspaces.length === 0) {
      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, user.tenantId) })
      if (!tenant || tenant.status !== 'active') {
        throw { statusCode: 403, code: 'TENANT_SUSPENDED', message: 'Account suspended' }
      }
      // Create the missing workspace_member record for legacy user
      await db.insert(workspaceMembers).values({ tenantId: user.tenantId, userId: user.id, role: user.role }).onConflictDoNothing()
      activeWorkspaces = [{ id: tenant.id, name: tenant.name, slug: tenant.slug, role: user.role }]
    }

    // Use the first workspace as default active one
    const activeTenantId = activeWorkspaces[0]!.id
    const activeRole = activeWorkspaces[0]!.role as UserRole

    const tokens = await this.generateTokenPair(user.id, activeTenantId, activeRole)
    return { ...tokens, workspaces: activeWorkspaces }
  }

  async switchWorkspace(userId: string, targetTenantId: string): Promise<AuthTokens> {
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.tenantId, targetTenantId)),
      with: { tenant: true },
    })
    if (!membership || membership.tenant?.status !== 'active') {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Workspace not found or access denied' }
    }
    return this.generateTokenPair(userId, targetTenantId, membership.role as UserRole)
  }

  async getUserWorkspaces(userId: string): Promise<{ id: string; name: string; slug: string; role: string; plan: string }[]> {
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.userId, userId),
      with: { tenant: true },
    })
    return memberships
      .filter((m) => m.tenant?.status === 'active')
      .map((m) => ({ id: m.tenantId, name: m.tenant!.name, slug: m.tenant!.slug, role: m.role, plan: m.tenant!.plan }))
  }

  async inviteMember(tenantId: string, invitedByUserId: string, email: string, role: string): Promise<string> {
    // Check if already a member
    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) })
    if (existingUser) {
      const existing = await db.query.workspaceMembers.findFirst({
        where: and(eq(workspaceMembers.tenantId, tenantId), eq(workspaceMembers.userId, existingUser.id)),
      })
      if (existing) throw { statusCode: 409, code: 'ALREADY_MEMBER', message: 'User is already a member of this workspace' }
    }

    const rawToken = randomBytes(32).toString('base64url')
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.insert(userInvitations).values({
      tenantId,
      email: email.toLowerCase(),
      role,
      tokenHash,
      invitedByUserId,
      expiresAt,
    })

    return rawToken
  }

  async acceptInvite(token: string, acceptingUserId: string): Promise<void> {
    const tokenHash = hashToken(token)
    const invitation = await db.query.userInvitations.findFirst({
      where: and(eq(userInvitations.tokenHash, tokenHash), eq(userInvitations.isAccepted, false)),
    })
    if (!invitation) throw { statusCode: 404, code: 'INVALID_TOKEN', message: 'Invalid or expired invite' }
    if (new Date(invitation.expiresAt) < new Date()) throw { statusCode: 410, code: 'EXPIRED', message: 'Invite expired' }

    const user = await db.query.users.findFirst({ where: eq(users.id, acceptingUserId) })
    if (!user) throw { statusCode: 404, code: 'NOT_FOUND', message: 'User not found' }

    await db.transaction(async (tx) => {
      await tx.insert(workspaceMembers).values({
        tenantId: invitation.tenantId,
        userId: acceptingUserId,
        role: invitation.role as UserRole,
        invitedBy: invitation.invitedByUserId ?? undefined,
      }).onConflictDoNothing()
      await tx.update(userInvitations).set({ isAccepted: true }).where(eq(userInvitations.id, invitation.id))
    })
  }

  async refresh(token: string, ipAddress?: string): Promise<AuthTokens> {
    const tokenHash = hashToken(token)

    const storedToken = await db.query.refreshTokens.findFirst({
      where: and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.isRevoked, false)),
      with: { user: true },
    })

    if (!storedToken) {
      // Potential token reuse — revoke entire family
      const anyToken = await db.query.refreshTokens.findFirst({
        where: eq(refreshTokens.tokenHash, tokenHash),
      })
      if (anyToken) {
        await db
          .update(refreshTokens)
          .set({ isRevoked: true })
          .where(eq(refreshTokens.family, anyToken.family))
      }
      throw { statusCode: 401, code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' }
    }

    if (new Date(storedToken.expiresAt) < new Date()) {
      throw { statusCode: 401, code: 'TOKEN_EXPIRED', message: 'Refresh token expired' }
    }

    // Revoke old token
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, storedToken.id))

    const newTokens = await this.generateTokenPair(
      storedToken.userId,
      storedToken.tenantId,
      storedToken.user.role,
      storedToken.family, // maintain token family
      ipAddress
    )

    return newTokens
  }

  async logout(token: string): Promise<void> {
    const tokenHash = hashToken(token)
    await db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.tokenHash, tokenHash))
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.userId, userId))
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) throw { statusCode: 404, code: 'NOT_FOUND', message: 'User not found' }

    const valid = await argon2.verify(user.passwordHash, currentPassword)
    if (!valid) throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' }

    const newHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })

    await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId))
  }

  private async generateTokenPair(
    userId: string,
    tenantId: string,
    role: UserRole,
    existingFamily?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      tid: tenantId,
      role,
    }

    const accessToken = this.app.jwt.sign(payload)

    // Generate cryptographically secure refresh token
    const rawRefreshToken = randomBytes(64).toString('base64url')
    const tokenHash = hashToken(rawRefreshToken)
    const family = existingFamily ?? randomBytes(16).toString('hex')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)

    await db.insert(refreshTokens).values({
      tenantId,
      userId,
      tokenHash,
      family,
      isRevoked: false,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      expiresAt,
    })

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_MS / 1000,
    }
  }
}
