import type { UserRole } from './auth.js'

export type UserStatus = 'active' | 'inactive' | 'invited'

export interface User {
  id: string
  tenantId: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  avatarUrl?: string
  createdAt: string
}

export interface UserProfile extends User {
  tenant: {
    id: string
    name: string
    slug: string
    plan: string
  }
}

export interface InviteUserRequest {
  email: string
  name: string
  role: UserRole
}

export interface UpdateUserRoleRequest {
  role: UserRole
}
