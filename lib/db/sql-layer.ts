import { Config, Layer } from "effect"
import { PgClient } from "@effect/sql-pg"

/**
 * PostgreSQL connection layer using @effect/sql.
 * Reads DATABASE_URL from environment variables.
 */
export const PgLive = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL"),
})
