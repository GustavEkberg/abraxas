import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "@/schemas"

/**
 * PostgreSQL connection pool.
 * Configured for development with reasonable defaults.
 */
const connectionString = process.env.DATABASE_URL!

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

/**
 * Drizzle database instance with full schema.
 */
export const db = drizzle(client, { schema })

export type Database = typeof db
