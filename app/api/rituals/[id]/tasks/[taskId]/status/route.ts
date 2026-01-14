import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { requireAuth } from "@/lib/api/auth"
import { DrizzleLive } from "@/lib/db/drizzle-layer"
import * as Tasks from "@/lib/effects/tasks"
import * as Projects from "@/lib/effects/projects"
import * as OpencodeSessions from "@/lib/effects/opencode-sessions"
import { isSessionWatched } from "@/lib/opencode/session-watcher"

/**
 * GET /api/rituals/[id]/tasks/[taskId]/status
 * Check task execution status.
 * 
 * This endpoint:
 * - Gets current task and session status
 * - Returns whether a background watcher is active
 * 
 * Note: Session completion/errors are handled automatically by the
 * background watcher started when execution begins. No polling needed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const program = Effect.gen(function* () {
    // Verify ritual exists and user owns it
    const ritual = yield* Projects.getProjectById(id)
    if (ritual.userId !== session.userId) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "You do not have access to this ritual" },
          { status: 403 }
        )
      )
    }

    // Get task
    const task = yield* Tasks.getTaskById(taskId)
    if (task.projectId !== id) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Invocation does not belong to this ritual" },
          { status: 404 }
        )
      )
    }

    // Get the active OpenCode session (if any)
    const sessions = yield* OpencodeSessions.listSessionsByTaskId(taskId)
    const activeSession = sessions.find((s) => s.status === "in_progress")

    // Check if background watcher is active
    const watcherActive = activeSession ? isSessionWatched(activeSession.id) : false

    return {
      status: task.executionState,
      taskStatus: task.status,
      watcherActive,
      message: "Status check complete",
    }
  })

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        if (error instanceof NextResponse) {
          return Effect.succeed(error)
        }

        console.error("Failed to check task status:", error)
        return Effect.succeed(
          NextResponse.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to check task status",
            },
            { status: 500 }
          )
        )
      })
    )
  )

  if (result instanceof NextResponse) {
    return result
  }

  return NextResponse.json(result)
}
