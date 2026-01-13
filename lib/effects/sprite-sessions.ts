import { Effect } from "effect"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import {
  spriteSessions,
  type SpriteSession,
  type NewSpriteSession,
  type SessionStatus,
} from "@/schemas"
import {
  DatabaseQueryError,
  RecordNotFoundError,
  type DatabaseError,
} from "@/lib/db/errors"

/**
 * Get session by ID.
 */
export const getSessionById = (
  id: string
): Effect.Effect<SpriteSession, DatabaseError, never> =>
  Effect.tryPromise({
    try: () =>
      db.query.spriteSessions.findFirst({ where: eq(spriteSessions.id, id) }),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to fetch session",
        cause: error,
      }),
  }).pipe(
    Effect.flatMap((session) =>
      session
        ? Effect.succeed(session)
        : Effect.fail(
            new RecordNotFoundError({
              message: `Session not found with id: ${id}`,
              table: "sprite_sessions",
              id,
            })
          )
    )
  )

/**
 * List all sessions for a task.
 */
export const listSessionsByTaskId = (
  taskId: string
): Effect.Effect<SpriteSession[], DatabaseError, never> =>
  Effect.tryPromise({
    try: () =>
      db.query.spriteSessions.findMany({
        where: eq(spriteSessions.taskId, taskId),
        orderBy: (spriteSessions, { desc }) => [desc(spriteSessions.createdAt)],
      }),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to list sessions",
        cause: error,
      }),
  })

/**
 * Create new session.
 */
export const createSession = (
  data: NewSpriteSession
): Effect.Effect<SpriteSession, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      const [session] = await db
        .insert(spriteSessions)
        .values(data)
        .returning()
      return session
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to create session",
        cause: error,
      }),
  })

/**
 * Update session status.
 */
export const updateSessionStatus = (
  id: string,
  status: SessionStatus,
  data?: {
    pullRequestUrl?: string
    errorMessage?: string
    logs?: string
  }
): Effect.Effect<SpriteSession, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      const [session] = await db
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
      return session
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to update session status",
        cause: error,
      }),
  }).pipe(
    Effect.flatMap((session) =>
      session
        ? Effect.succeed(session)
        : Effect.fail(
            new RecordNotFoundError({
              message: `Session not found with id: ${id}`,
              table: "sprite_sessions",
              id,
            })
          )
    )
  )
