import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Pool for regular queries
const queryClient = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(queryClient, { schema })

// Create a tenant-scoped database client that sets RLS context
export function createTenantDb(tenantId: string) {
  const tenantClient = postgres(connectionString!, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {}, // suppress notices
  })

  const tenantDb = drizzle(tenantClient, { schema })

  return {
    db: tenantDb,
    async withRls<T>(fn: (db: typeof tenantDb) => Promise<T>): Promise<T> {
      return tenantClient.begin(async (sql) => {
        await sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`
        return fn(tenantDb)
      }) as Promise<T>
    },
    async close() {
      await tenantClient.end()
    },
  }
}

export type Database = typeof db
