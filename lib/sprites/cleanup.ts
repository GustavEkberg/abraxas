import { Effect } from "effect"
import { lt, eq, and } from "drizzle-orm"
import { DrizzleService, DrizzleLive } from "@/lib/db/drizzle-layer"
import { opencodeSessions } from "@/schemas"
import { destroySprite, SpritesConfig } from "./client"
import * as OpencodeSessions from "@/lib/effects/opencode-sessions"
import * as Tasks from "@/lib/effects/tasks"
import * as Comments from "@/lib/effects/comments"

/**
 * Find and cleanup stale sprite sessions.
 * 
 * A session is considered stale if:
 * - executionMode is "sprite"
 * - status is "in_progress"
 * - createdAt is older than SPRITE_TIMEOUT_MS (default: 1 hour)
 */
export const cleanupStaleSessions = () =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.catchAll(() => Effect.succeed({ timeoutMs: 3600000 }))
    )

    const db = yield* DrizzleService

    const cutoffTime = new Date(Date.now() - config.timeoutMs)

    // Find stale sessions
    const staleSessions = yield* db.query.opencodeSessions.findMany({
      where: and(
        eq(opencodeSessions.executionMode, "sprite"),
        eq(opencodeSessions.status, "in_progress"),
        lt(opencodeSessions.createdAt, cutoffTime)
      ),
    })

    console.log(`[Cleanup] Found ${staleSessions.length} stale sprite sessions`)

    // Process each stale session
    for (const session of staleSessions) {
      yield* cleanupStaleSession(session.id, session.taskId, session.spriteName)
    }

    return { cleaned: staleSessions.length }
  })

/**
 * Cleanup a single stale session.
 */
function cleanupStaleSession(
  sessionId: string,
  taskId: string,
  spriteName: string | null
) {
  return Effect.gen(function* () {
    console.log(`[Cleanup] Processing stale session: ${sessionId}`)

    // Destroy the sprite if it exists
    if (spriteName) {
      yield* destroySprite(spriteName).pipe(
        Effect.tap(() =>
          Effect.sync(() =>
            console.log(`[Cleanup] Destroyed sprite: ${spriteName}`)
          )
        ),
        Effect.catchAll((error) => {
          console.error(`[Cleanup] Failed to destroy sprite ${spriteName}:`, error)
          return Effect.void
        })
      )
    }

    // Mark session as errored
    yield* OpencodeSessions.errorSession(
      sessionId,
      "Execution timed out after 1 hour"
    )

    // Update task status
    yield* Tasks.updateTask(taskId, {
      status: "cursed",
      executionState: "error",
    })

    // Post timeout comment
    yield* Comments.createAgentComment(
      taskId,
      `Invocation execution timed out.\n\nThe sprite execution exceeded the maximum allowed time (1 hour) and was terminated.\n\nPlease review and try again with a simpler task scope.`,
      "Abraxas"
    )

    console.log(`[Cleanup] Completed cleanup for session: ${sessionId}`)
  })
}

/**
 * Run cleanup as a standalone function.
 * Can be called from a cron job or API route.
 */
export async function runCleanup(): Promise<{ cleaned: number }> {
  const result = await Effect.runPromise(
    cleanupStaleSessions().pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        console.error("[Cleanup] Cleanup failed:", error)
        return Effect.succeed({ cleaned: 0 })
      })
    )
  )

  return result
}
