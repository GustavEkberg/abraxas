import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { requireAuth } from "@/lib/api/auth"
import { DrizzleLive } from "@/lib/db/drizzle-layer"
import * as Projects from "@/lib/effects/projects"

/**
 * GET /api/rituals/[id]
 * Get single ritual by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const program = Projects.getProjectById(id)

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        if (error._tag === "RecordNotFoundError") {
          return Effect.fail(
            NextResponse.json({ error: "Ritual not found" }, { status: 404 })
          )
        }
        console.error("Failed to get ritual:", error)
        return Effect.fail(
          NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
          )
        )
      })
    )
  )

  // Verify ownership
  if (result.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(result)
}

/**
 * PATCH /api/rituals/[id]
 * Update ritual.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  // Verify ownership first
  const getProgram = Projects.getProjectById(id)
  const existing = await Effect.runPromise(
    getProgram.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        if (error._tag === "RecordNotFoundError") {
          return Effect.fail(
            NextResponse.json({ error: "Ritual not found" }, { status: 404 })
          )
        }
        return Effect.fail(
          NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
          )
        )
      })
    )
  )

  if (existing.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()

  const updateProgram = Projects.updateProject(id, {
    name: body.name,
    description: body.description,
    repositoryPath: body.repositoryPath,
    githubToken: body.githubToken,
    agentsMdContent: body.agentsMdContent,
  })

  const result = await Effect.runPromise(
    updateProgram.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        console.error("Failed to update ritual:", error)
        return Effect.fail(
          NextResponse.json(
            { error: "Failed to update ritual" },
            { status: 500 }
          )
        )
      })
    )
  )

  return NextResponse.json(result)
}

/**
 * DELETE /api/rituals/[id]
 * Delete ritual.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  // Verify ownership first
  const getProgram = Projects.getProjectById(id)
  const existing = await Effect.runPromise(
    getProgram.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        if (error._tag === "RecordNotFoundError") {
          return Effect.fail(
            NextResponse.json({ error: "Ritual not found" }, { status: 404 })
          )
        }
        return Effect.fail(
          NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
          )
        )
      })
    )
  )

  if (existing.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const deleteProgram = Projects.deleteProject(id)

  await Effect.runPromise(
    deleteProgram.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        console.error("Failed to delete ritual:", error)
        return Effect.fail(
          NextResponse.json(
            { error: "Failed to delete ritual" },
            { status: 500 }
          )
        )
      })
    )
  )

  return NextResponse.json({ success: true }, { status: 200 })
}
