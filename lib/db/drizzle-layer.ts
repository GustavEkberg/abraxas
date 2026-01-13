import { Effect, Layer, Context } from "effect"
import * as SqlDrizzle from "@effect/sql-drizzle/Pg"
import { PgLive } from "./sql-layer"
import * as schema from "@/schemas"
import type { PgRemoteDatabase } from "drizzle-orm/pg-proxy"

/**
 * Custom Drizzle service tag with full schema typing.
 */
export class DrizzleService extends Context.Tag("DrizzleService")<
  DrizzleService,
  PgRemoteDatabase<typeof schema>
>() {}

/**
 * Drizzle service layer with full schema.
 * Provides typed database access through Effect.
 */
export const DrizzleLive = Layer.effect(
  DrizzleService,
  SqlDrizzle.make({ schema })
).pipe(Layer.provide(PgLive))
