import { NextRequest, NextResponse } from "next/server";
import { Effect } from "effect";
import { requireAuth } from "@/lib/api/auth";
import { DrizzleLive } from "@/lib/db/drizzle-layer";
import * as Tasks from "@/lib/effects/tasks";
import * as Projects from "@/lib/effects/projects";
import * as Comments from "@/lib/effects/comments";
import * as OpencodeSessions from "@/lib/effects/opencode-sessions";
import { executeTask } from "@/lib/opencode/task-execution";
import { requireOpencodeServer } from "@/lib/opencode/health-check";

/**
 * POST /api/rituals/[id]/tasks/[taskId]/execute
 * Execute a task using OpenCode.
 * 
 * Creates an OpenCode session, passes task context and comments,
 * and updates the task execution state.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string; }>; }
) {
  const { id, taskId } = await params;
  const session = await requireAuth(request);
  if (session instanceof NextResponse) return session;

  const program = Effect.gen(function* () {
    // Check if OpenCode server is running
    yield* Effect.tryPromise({
      try: () => requireOpencodeServer(),
      catch: (error) => {
        return error instanceof Error ? error : new Error(String(error));
      },
    });

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

    // Get task to verify ownership
    const task = yield* Tasks.getTaskById(taskId);
    if (task.projectId !== id) {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Invocation does not belong to this ritual" },
          { status: 404 }
        )
      );
    }

    // Check if task is already executing
    if (task.executionState === "in_progress") {
      return yield* Effect.fail(
        NextResponse.json(
          { error: "Invocation is already executing" },
          { status: 409 }
        )
      );
    }

    // Get all comments for context
    const commentsList = yield* Comments.listCommentsByTaskId(taskId);

    // Create OpenCode session record
    const opencodeSession = yield* OpencodeSessions.createSession({
      taskId,
      status: "pending",
    });

    // Execute task with OpenCode (wrapped in tryPromise since it's not Effect-based yet)
    const opencodeSessionId = yield* Effect.tryPromise({
      try: async () => {
        return await executeTask(
          {
            id: task.id,
            title: task.title,
            description: task.description,
          },
          {
            id: ritual.id,
            name: ritual.name,
            repositoryPath: ritual.repositoryPath,
          },
          commentsList.map((c) => ({
            content: c.content,
            isAgentComment: c.isAgentComment,
            agentName: c.agentName,
            createdAt: c.createdAt,
          }))
        );
      },
      catch: (error) => {
        const serverUrl = process.env.OPENCODE_SERVER_URL || "http://localhost:4096";
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("OpenCode execution failed:", {
          error: errorMessage,
          serverUrl,
          taskId: task.id,
          cause: error instanceof Error ? error.cause : undefined,
        });
        return new Error(
          `Failed to connect to OpenCode server at ${serverUrl}. ` +
          `Please ensure OpenCode is running: 'opencode serve --port 4096'. ` +
          `Error: ${errorMessage}`
        );
      },
    });
    console.log("opencodeSessionId:", opencodeSessionId);
    // Update task execution state to in_progress
    yield* Tasks.updateTask(taskId, { executionState: "in_progress" });

    // Update session with OpenCode session ID and set to in_progress
    yield* OpencodeSessions.updateSession(opencodeSession.id, {
      sessionId: opencodeSessionId,
      status: "in_progress",
    });

    console.log("Adding agent comment...");
    // Add agent comment to indicate execution started
    yield* Comments.createAgentComment(
      taskId,
      `Invocation execution started.\n\nOpenCode session: \`${opencodeSessionId}\`\n\nMonitor progress in your OpenCode interface.`,
      "OpenCode Agent"
    );

    return {
      success: true,
      opencodeSessionId,
      sessionId: opencodeSession.id,
    };
  });

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        if (error instanceof NextResponse) {
          return Effect.succeed(error);
        }

        console.error("Failed to execute task:", error);
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
        );
      })
    )
  );

  if (result instanceof NextResponse) {
    return result;
  }

  return NextResponse.json(result, { status: 201 });
}
