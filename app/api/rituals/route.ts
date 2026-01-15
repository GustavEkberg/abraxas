import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { requireAuth } from "@/lib/api/auth"
import { DrizzleLive } from "@/lib/db/drizzle-layer"
import * as Projects from "@/lib/effects/projects"

/**
 * GET /api/rituals
 * List all rituals for authenticated user.
 */
export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const program = Projects.listProjectsByUserId(session.userId)

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        console.error("Failed to list rituals:", error)
        return Effect.succeed([])
      })
    )
  )

  return NextResponse.json(result)
}

/**
 * POST /api/rituals
 * Create new ritual.
 */
export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const body = await request.json()

  const program = Projects.createProject({
    userId: session.userId,
    name: body.name,
    repositoryUrl: body.repositoryUrl,
    githubToken: body.githubToken,
    agentsMdContent: body.agentsMdContent || null,
    description: body.description || null,
  })

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        console.error("Failed to create ritual:", error)
        return Effect.fail(
          NextResponse.json(
            { error: "Failed to create ritual" },
            { status: 500 }
          )
        )
      })
    )
  )

  return NextResponse.json(result, { status: 201 })
}
