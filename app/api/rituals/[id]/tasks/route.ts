import { NextRequest, NextResponse } from "next/server";
import { Effect } from "effect";
import { requireAuth } from "@/lib/api/auth";
import * as Tasks from "@/lib/effects/tasks";
import * as Projects from "@/lib/effects/projects";
import { type NewTask } from "@/schemas";
import { DrizzleLive } from "@/lib/db/drizzle-layer";

/**
 * GET /api/rituals/[id]/tasks
 * List all invocations for a ritual.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireAuth(request);
  if (session instanceof NextResponse) return session;

  const program = Effect.gen(function* () {
    // Verify ritual exists and user owns it
    const ritual = yield* Projects.getProjectById(id);
    if (ritual.userId !== session.userId) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "You do not have access to this ritual" },
          { status: 403 }
        )
      );
    }

    // Fetch all invocations for this ritual
    const invocations = yield* Tasks.listTasksByProjectId(id);
    return invocations;
  });

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        // If it's already a NextResponse, return it
        if (error instanceof NextResponse) {
          return Effect.succeed(error);
        }
        
        console.error("Failed to fetch invocations:", error);
        return Effect.succeed(
          NextResponse.json(
            { error: "Failed to fetch invocations" },
            { status: 500 }
          )
        );
      })
    )
  );

  // If result is a NextResponse (error), return it directly
  if (result instanceof NextResponse) {
    return result;
  }

  return NextResponse.json(result);
}

/**
 * POST /api/rituals/[id]/tasks
 * Create a new invocation for a ritual.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireAuth(request);
  if (session instanceof NextResponse) return session;

  const body = await request.json();

  const program = Effect.gen(function* () {
    // Verify ritual exists and user owns it
    const ritual = yield* Projects.getProjectById(id);
    if (ritual.userId !== session.userId) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "You do not have access to this ritual" },
          { status: 403 }
        )
      );
    }

    // Create invocation
    const input: NewTask = {
      projectId: id,
      title: body.title,
      description: body.description,
      status: body.status || "abyss",
    };

    const invocation = yield* Tasks.createTask(input);
    return invocation;
  });

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        // If it's already a NextResponse, return it
        if (error instanceof NextResponse) {
          return Effect.succeed(error);
        }

        console.error("Failed to create invocation:", error);
        return Effect.succeed(
          NextResponse.json(
            { error: "Failed to create invocation" },
            { status: 500 }
          )
        );
      })
    )
  );

  // If result is a NextResponse (error), return it directly
  if (result instanceof NextResponse) {
    return result;
  }

  return NextResponse.json(result, { status: 201 });
}
