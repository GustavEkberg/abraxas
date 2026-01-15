import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { createHmac, timingSafeEqual } from "crypto"
import { DrizzleLive } from "@/lib/db/drizzle-layer"
import * as Tasks from "@/lib/effects/tasks"
import * as Comments from "@/lib/effects/comments"
import * as OpencodeSessions from "@/lib/effects/opencode-sessions"
import { destroySprite } from "@/lib/sprites/client"

/**
 * Webhook payload types from Sprite execution.
 */
interface WebhookPayload {
  type: "started" | "completed" | "error" | "question" | "progress"
  sessionId: string
  taskId: string
  summary?: string
  error?: string
  question?: string
  stats?: {
    messageCount: number
    inputTokens: number
    outputTokens: number
  }
  progress?: {
    message: string
    currentStep?: string
    messageCount?: number
    inputTokens?: number
    outputTokens?: number
  }
}

/**
 * Verify HMAC signature.
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = `sha256=${createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

/**
 * POST /api/webhooks/sprite/[sessionId]
 * 
 * Webhook handler for Sprite execution callbacks.
 * Called by the callback script running inside the Sprite when:
 * - OpenCode completes successfully
 * - OpenCode encounters an error
 * - OpenCode has a question for the user
 * 
 * Note: [sessionId] in the route is actually the taskId for routing purposes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId: taskId } = await params

  // Get raw body for signature verification
  const rawBody = await request.text()
  const signature = request.headers.get("X-Webhook-Signature")

  // Log incoming webhook for debugging
  console.log("[Webhook] Received sprite callback:", {
    taskId,
    signature: signature ? `${signature.slice(0, 20)}...` : "missing",
    bodyLength: rawBody.length,
  })

  if (!signature) {
    console.log("[Webhook] Error: Missing signature header")
    return NextResponse.json(
      { error: "Missing X-Webhook-Signature header" },
      { status: 401 }
    )
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.log("[Webhook] Error: Invalid JSON payload")
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  // Log parsed payload
  console.log("[Webhook] Payload:", {
    type: payload.type,
    sessionId: payload.sessionId,
    taskId: payload.taskId,
    summary: payload.summary?.slice(0, 100),
    error: payload.error,
    question: payload.question?.slice(0, 100),
    stats: payload.stats,
    progress: payload.progress,
  })

  const program = Effect.gen(function* () {
    // Get most recent session for this task to verify signature
    const session = yield* OpencodeSessions.getLatestSessionByTaskId(taskId)

    if (!session.webhookSecret) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Session not configured for webhooks" },
          { status: 400 }
        )
      )
    }

    // Verify signature
    if (!verifySignature(rawBody, signature, session.webhookSecret)) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        )
      )
    }

    // Verify taskId matches
    if (payload.taskId !== session.taskId) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Task ID mismatch" },
          { status: 400 }
        )
      )
    }

    // Handle based on payload type
    console.log(`[Webhook] Processing ${payload.type} for task ${session.taskId}`)
    
    switch (payload.type) {
      case "started":
        yield* handleStarted(session.taskId)
        console.log(`[Webhook] Task ${session.taskId} marked as started`)
        break
      case "completed":
        yield* handleCompletion(session.taskId, session.id, payload)
        console.log(`[Webhook] Task ${session.taskId} marked as completed`)
        break
      case "error":
        yield* handleError(session.taskId, session.id, payload)
        console.log(`[Webhook] Task ${session.taskId} marked as error`)
        break
      case "question":
        yield* handleQuestion(session.taskId, payload)
        console.log(`[Webhook] Question posted for task ${session.taskId}`)
        break
      case "progress":
        yield* handleProgress(session.taskId, session.id, payload)
        console.log(`[Webhook] Progress updated for task ${session.taskId}`)
        break
      default:
        console.log(`[Webhook] Unknown payload type: ${payload.type}`)
        return yield* Effect.fail(
          NextResponse.json(
            { error: `Unknown payload type: ${payload.type}` },
            { status: 400 }
          )
        )
    }

    // Destroy sprite after completion or error (not for questions, progress, or started)
    if (payload.type !== "question" && payload.type !== "progress" && payload.type !== "started" && session.spriteName) {
      console.log(`[Webhook] Destroying sprite: ${session.spriteName}`)
      yield* destroySprite(session.spriteName).pipe(
        Effect.tap(() => Effect.sync(() => 
          console.log(`[Webhook] Sprite ${session.spriteName} destroyed`)
        )),
        Effect.catchAll((error) => {
          console.error(`[Webhook] Failed to destroy sprite ${session.spriteName}:`, error)
          return Effect.void
        })
      )
    }

    console.log(`[Webhook] Completed processing for task ${session.taskId}`)
    return { success: true }
  })

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        if (error instanceof NextResponse) {
          return Effect.succeed(error)
        }

        console.error("Webhook handler error:", error)
        return Effect.succeed(
          NextResponse.json(
            { error: "Internal server error" },
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

/**
 * Handle execution started.
 */
function handleStarted(taskId: string) {
  return Effect.gen(function* () {
    // Add agent comment to indicate OpenCode has started
    yield* Comments.createAgentComment(
      taskId,
      `OpenCode execution started. The demons are now summoning...`,
      "Abraxas"
    )
  })
}

/**
 * Handle successful completion.
 */
function handleCompletion(
  taskId: string,
  sessionId: string,
  payload: WebhookPayload
) {
  return Effect.gen(function* () {
    // Update session stats if available
    if (payload.stats) {
      yield* OpencodeSessions.updateSessionStats(
        sessionId,
        payload.stats.messageCount,
        payload.stats.inputTokens,
        payload.stats.outputTokens
      )
    }

    // Mark session as completed
    yield* OpencodeSessions.completeSession(sessionId)

    // Move task to trial for review
    yield* Tasks.updateTask(taskId, {
      status: "trial",
      executionState: "awaiting_review",
    })

    // Post completion comment
    let commentText = `Invocation execution completed successfully.\n\n${payload.summary || "Task finished."}`
    if (payload.stats) {
      commentText += `\n\n**Stats:** ${payload.stats.messageCount} messages, ${payload.stats.inputTokens} input tokens, ${payload.stats.outputTokens} output tokens`
    }
    yield* Comments.createAgentComment(taskId, commentText, "Abraxas")
  })
}

/**
 * Handle error.
 */
function handleError(
  taskId: string,
  sessionId: string,
  payload: WebhookPayload
) {
  return Effect.gen(function* () {
    // Mark session as errored
    yield* OpencodeSessions.errorSession(
      sessionId,
      payload.error || "Unknown error"
    )

    // Move task to cursed
    yield* Tasks.updateTask(taskId, {
      status: "cursed",
      executionState: "error",
    })

    // Post error comment
    const commentText = `Invocation execution failed.\n\n**Error:** ${payload.error || "Unknown error"}\n\nPlease review the error and try again.`
    yield* Comments.createAgentComment(taskId, commentText, "Abraxas")
  })
}

/**
 * Handle question from agent.
 */
function handleQuestion(taskId: string, payload: WebhookPayload) {
  return Effect.gen(function* () {
    const commentText = `**Question from Abraxas:**\n\n${payload.question}\n\nPlease respond in the comments to continue execution.`
    yield* Comments.createAgentComment(taskId, commentText, "Abraxas")
  })
}

/**
 * Handle progress update during execution.
 */
function handleProgress(
  taskId: string,
  sessionId: string,
  payload: WebhookPayload
) {
  return Effect.gen(function* () {
    // Get current session to check if it's already completed
    const session = yield* OpencodeSessions.getSessionById(sessionId)
    
    // Ignore progress updates if session is already completed or errored (race condition)
    if (session.status === "completed" || session.status === "error") {
      console.log(`[Webhook] Ignoring progress update for ${session.status} session ${sessionId}`)
      return
    }

    // Update session with incremental stats if provided
    if (payload.progress) {
      const { messageCount, inputTokens, outputTokens } = payload.progress

      if (messageCount !== undefined && inputTokens !== undefined && outputTokens !== undefined) {
        yield* OpencodeSessions.updateSessionStats(
          sessionId,
          messageCount,
          inputTokens,
          outputTokens
        )
      }
    }

    // Update task execution state to show it's in progress
    yield* Tasks.updateTask(taskId, {
      executionState: "in_progress",
    })
  })
}
