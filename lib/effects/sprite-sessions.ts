import { Effect } from "effect"
import { eq, desc } from "drizzle-orm"
import { DrizzleService } from "@/lib/db/drizzle-layer"
import {
  spriteSessions,
  type SpriteSession,
  type NewSpriteSession,
  type SessionStatus,
} from "@/schemas"
import {
  RecordNotFoundError,
  type DatabaseError,
} from "@/lib/db/errors"

/**
 * Get session by ID.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const getSessionById = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const session = yield* db.query.spriteSessions.findFirst({
      where: eq(spriteSessions.id, id),
    })

    if (!session) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `Session not found with id: ${id}`,
          table: "sprite_sessions",
          id,
        })
      )
    }

    return session
  })

/**
 * List all sessions for a task.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const listSessionsByTaskId = (taskId: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const sessionList = yield* db.query.spriteSessions.findMany({
      where: eq(spriteSessions.taskId, taskId),
      orderBy: desc(spriteSessions.createdAt),
    })

    return sessionList
  })

/**
 * Create new session.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const createSession = (data: NewSpriteSession) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const [session] = yield* db
      .insert(spriteSessions)
      .values(data)
      .returning()

    return session
  })

/**
 * Update session status.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const updateSessionStatus = (
  id: string,
  status: SessionStatus,
  data?: {
    pullRequestUrl?: string
    errorMessage?: string
    logs?: string
  }
) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const [session] = yield* db
      .update(spriteSessions)
      .set({
        status,
        ...data,
        updatedAt: new Date(),
        completedAt:
          status === "completed" || status === "error" ? new Date() : undefined,
      })
      .where(eq(spriteSessions.id, id))
      .returning()

    if (!session) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `Session not found with id: ${id}`,
          table: "sprite_sessions",
          id,
        })
      )
    }

    return session
  })
