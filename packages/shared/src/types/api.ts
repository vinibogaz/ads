export interface ApiResponse<T = unknown> {
  data: T
  meta?: PaginationMeta
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
  details?: Record<string, string[]>
}

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface PaginationQuery {
  page?: number
  perPage?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  version: string
  timestamp: string
  services: {
    database: 'ok' | 'error'
    redis: 'ok' | 'error'
    aiWorker: 'ok' | 'error'
  }
}
