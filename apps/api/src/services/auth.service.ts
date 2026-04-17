import { eq, and } from 'drizzle-orm'
import * as argon2 from 'argon2'
import { createHash, randomBytes } from 'crypto'
import { db, users, tenants, refreshTokens, passwordResetTokens } from '@synthex/db'
import type { AuthTokens, JwtPayload, UserRole } from '@synthex/shared'
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

    // Create tenant + owner user atomically
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

      return { tenant: tenant!, user: user! }
    })

    return this.generateTokenPair(result.user.id, result.tenant.id, result.user.role)
  }

  async login(email: string, password: string): Promise<AuthTokens> {
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

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, user.tenantId),
    })

    if (!tenant || tenant.status !== 'active') {
      throw { statusCode: 403, code: 'TENANT_SUSPENDED', message: 'Account suspended' }
    }

    return this.generateTokenPair(user.id, user.tenantId, user.role)
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
