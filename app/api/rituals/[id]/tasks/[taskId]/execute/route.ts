import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { requireAuth } from "@/lib/api/auth"
import { DrizzleLive } from "@/lib/db/drizzle-layer"
import * as Tasks from "@/lib/effects/tasks"
import * as Projects from "@/lib/effects/projects"
import * as Comments from "@/lib/effects/comments"
import * as OpencodeSessions from "@/lib/effects/opencode-sessions"
import { buildTaskPrompt } from "@/lib/opencode/task-execution"
import { spawnSpriteForTask } from "@/lib/sprites/lifecycle"

/**
 * POST /api/rituals/[id]/tasks/[taskId]/execute
 * Execute a task using Sprites.dev cloud execution.
 *
 * Creates a Sprite, clones the repository, runs OpenCode,
 * and handles completion via webhook callback.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  // Check if sprites are configured
  if (!process.env.SPRITES_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Sprite execution not configured. Set SPRITES_TOKEN environment variable.",
      },
      { status: 503 }
    )
  }

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

    // Verify repository URL is configured
    if (!ritual.repositoryUrl) {
      return yield* Effect.fail(
        NextResponse.json(
          {
            error:
              "Repository URL not configured. Update the ritual settings.",
          },
          { status: 400 }
        )
      )
    }

    // Get task to verify ownership
    const task = yield* Tasks.getTaskById(taskId)
    if (task.projectId !== id) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Invocation does not belong to this ritual" },
          { status: 404 }
        )
      )
    }

    // Check if task is already executing
    if (task.executionState === "in_progress") {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Invocation is already executing" },
          { status: 409 }
        )
      )
    }

    // Get all comments for context
    const commentsList = yield* Comments.listCommentsByTaskId(taskId)
    const commentsForContext = commentsList.map((c) => ({
      content: c.content,
      isAgentComment: c.isAgentComment,
      agentName: c.agentName,
      createdAt: c.createdAt,
    }))

    // Update task execution state to in_progress
    yield* Tasks.updateTask(taskId, { executionState: "in_progress" })

    // Build the prompt that will be sent to opencode
    const prompt = buildTaskPrompt(
      {
        title: task.title,
        description: task.description,
        type: task.type,
      },
      commentsForContext
    )

    // Spawn sprite and start execution
    const spriteResult = yield* spawnSpriteForTask({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        branchName: task.branchName,
      },
      project: {
        id: ritual.id,
        name: ritual.name,
        repositoryUrl: ritual.repositoryUrl,
        githubToken: ritual.githubToken,
      },
      prompt,
      comments: commentsForContext,
    }).pipe(
      Effect.mapError((error) => {
        console.error("Sprite spawn failed:", error)
        return new Error(`Failed to spawn sprite: ${error.message}`)
      })
    )

    // Update task with branch name if it's new
    if (!task.branchName) {
      yield* Tasks.updateTask(taskId, { branchName: spriteResult.branchName })
    }

    // Create session record with sprite info
    const opencodeSession = yield* OpencodeSessions.createSession({
      taskId,
      status: "in_progress",
      executionMode: "sprite",
      spriteName: spriteResult.spriteName,
      webhookSecret: spriteResult.webhookSecret,
      branchName: spriteResult.branchName,
    })

    // Add agent comment to indicate execution started
    yield* Comments.createAgentComment(
      taskId,
      `Invocation ritual started.\n\nSprite: \`${spriteResult.spriteName}\`\nBranch: \`${spriteResult.branchName}\`\n\nThe ritual proceeds in the cloud...`,
      "Abraxas"
    )

    return {
      success: true,
      spriteName: spriteResult.spriteName,
      branchName: spriteResult.branchName,
      sessionId: opencodeSession.id,
    }
  })

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        if (error instanceof NextResponse) {
          return Effect.succeed(error)
        }

        console.error("Failed to execute task:", error)
        return Effect.succeed(
          NextResponse.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to execute task",
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

  return NextResponse.json(result, { status: 201 })
}
