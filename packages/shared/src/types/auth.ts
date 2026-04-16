export interface JwtPayload {
  sub: string // user id
  tid: string // tenant id
  role: UserRole
  iat: number
  exp: number
}

export interface JwtRefreshPayload {
  sub: string
  tid: string
  jti: string // token family for rotation
  iat: number
  exp: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer'

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  tenantName: string
  tenantSlug?: string
}

export interface RefreshRequest {
  refreshToken: string
}
