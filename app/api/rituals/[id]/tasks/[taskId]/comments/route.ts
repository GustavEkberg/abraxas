import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { requireAuth } from "@/lib/api/auth"
import { DrizzleLive } from "@/lib/db/drizzle-layer"
import * as Comments from "@/lib/effects/comments"

/**
 * GET /api/rituals/[id]/tasks/[taskId]/comments
 * List all comments for a task.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { taskId } = await params
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const program = Comments.listCommentsByTaskId(taskId)

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        console.error("Failed to list comments:", error)
        return Effect.succeed([])
      })
    )
  )

  return NextResponse.json(result)
}

/**
 * POST /api/rituals/[id]/tasks/[taskId]/comments
 * Create new comment on a task.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { taskId } = await params
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const body = await request.json()

  const program = Comments.createUserComment(
    taskId,
    session.userId,
    body.content
  )

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        console.error("Failed to create comment:", error)
        return Effect.fail(
          NextResponse.json(
            { error: "Failed to create comment" },
            { status: 500 }
          )
        )
      })
    )
  )

  return NextResponse.json(result, { status: 201 })
}
