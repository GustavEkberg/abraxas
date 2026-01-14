import { NextRequest, NextResponse } from "next/server";
import { Effect } from "effect";
import { requireAuth } from "@/lib/api/auth";
import * as Tasks from "@/lib/effects/tasks";
import * as Projects from "@/lib/effects/projects";
import { type NewTask } from "@/schemas";
import { DrizzleLive } from "@/lib/db/drizzle-layer";

/**
 * GET /api/rituals/[id]/tasks/[taskId]
 * Get a single invocation.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
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

    // Get invocation
    const invocation = yield* Tasks.getTaskById(taskId);

    // Verify invocation belongs to this ritual
    if (invocation.projectId !== id) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Invocation does not belong to this ritual" },
          { status: 404 }
        )
      );
    }

    return invocation;
  });

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        if (error instanceof NextResponse) {
          return Effect.succeed(error);
        }

        console.error("Failed to fetch invocation:", error);
        return Effect.succeed(
          NextResponse.json(
            { error: "Failed to fetch invocation" },
            { status: 500 }
          )
        );
      })
    )
  );

  if (result instanceof NextResponse) {
    return result;
  }

  return NextResponse.json(result);
}

/**
 * PATCH /api/rituals/[id]/tasks/[taskId]
 * Update an invocation (including status changes for drag-and-drop).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
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

    // Get invocation to verify ownership
    const invocation = yield* Tasks.getTaskById(taskId);
    if (invocation.projectId !== id) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Invocation does not belong to this ritual" },
          { status: 404 }
        )
      );
    }

    // Update invocation
    const updates: Partial<NewTask> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.labels !== undefined) updates.labels = body.labels;
    if (body.dueDate !== undefined)
      updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.executionState !== undefined)
      updates.executionState = body.executionState;

    const updated = yield* Tasks.updateTask(taskId, updates);
    return updated;
  });

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        if (error instanceof NextResponse) {
          return Effect.succeed(error);
        }

        console.error("Failed to update invocation:", error);
        return Effect.succeed(
          NextResponse.json(
            { error: "Failed to update invocation" },
            { status: 500 }
          )
        );
      })
    )
  );

  if (result instanceof NextResponse) {
    return result;
  }

  return NextResponse.json(result);
}

/**
 * DELETE /api/rituals/[id]/tasks/[taskId]
 * Delete an invocation.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
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

    // Get invocation to verify ownership
    const invocation = yield* Tasks.getTaskById(taskId);
    if (invocation.projectId !== id) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Invocation does not belong to this ritual" },
          { status: 404 }
        )
      );
    }

    // Delete invocation
    yield* Tasks.deleteTask(taskId);
    return { success: true };
  });

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        if (error instanceof NextResponse) {
          return Effect.succeed(error);
        }

        console.error("Failed to delete invocation:", error);
        return Effect.succeed(
          NextResponse.json(
            { error: "Failed to delete invocation" },
            { status: 500 }
          )
        );
      })
    )
  );

  if (result instanceof NextResponse) {
    return result;
  }

  return NextResponse.json(result);
}
