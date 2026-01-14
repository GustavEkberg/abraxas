import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { requireAuth } from "@/lib/api/auth"
import { DrizzleLive } from "@/lib/db/drizzle-layer"
import * as Tasks from "@/lib/effects/tasks"
import * as Projects from "@/lib/effects/projects"
import * as OpencodeSessions from "@/lib/effects/opencode-sessions"
import { handleSessionCompletion, handleSessionQuestion } from "@/lib/opencode/completion-handler"
import { getSessionQuestion } from "@/lib/opencode/session-monitor"

/**
 * GET /api/rituals/[id]/tasks/[taskId]/status
 * Check task execution status and handle completion/questions.
 * 
 * This endpoint:
 * - Gets current task and session status
 * - Checks if OpenCode session is complete
 * - Posts completion/error comments
 * - Updates task status accordingly
 * - Checks for questions and posts them as comments
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

    // Check if task is currently executing
    if (task.executionState !== "in_progress") {
      return {
        status: task.executionState,
        message: "Task is not currently executing",
      }
    }

    // Get the active OpenCode session
    const sessions = yield* OpencodeSessions.listSessionsByTaskId(taskId)
    const activeSession = sessions.find((s) => s.status === "in_progress")

    if (!activeSession || !activeSession.sessionId) {
      return {
        status: "error",
        message: "No active OpenCode session found",
      }
    }

    // Handle completion/questions (wrapped in tryPromise since not Effect-based)
    const opencodeSessionId = activeSession.sessionId
    if (!opencodeSessionId) {
      return {
        status: "error",
        message: "OpenCode session ID not found",
      }
    }

    yield* Effect.tryPromise({
      try: async () => {
        // Check and handle completion
        await handleSessionCompletion(
          taskId,
          activeSession.id,
          opencodeSessionId
        )

        // Check for questions
        const question = await getSessionQuestion(opencodeSessionId)
        if (question) {
          await handleSessionQuestion(taskId, question)
        }
      },
      catch: (error) => {
        return new Error(
          `Failed to handle session status: ${error instanceof Error ? error.message : String(error)}`
        )
      },
    })

    // Fetch updated task to return current status
    const updatedTask = yield* Tasks.getTaskById(taskId)

    return {
      status: updatedTask.executionState,
      taskStatus: updatedTask.status,
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
