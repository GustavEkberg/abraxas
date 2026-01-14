import { Effect } from "effect";
import { DrizzleLive } from "@/lib/db/drizzle-layer";
import * as Tasks from "@/lib/effects/tasks";
import * as Comments from "@/lib/effects/comments";
import * as OpencodeSessions from "@/lib/effects/opencode-sessions";
import { isSessionComplete } from "./session-monitor";

/**
 * Handle OpenCode session completion.
 * 
 * - Updates session status in database
 * - Posts agent comment with results
 * - Updates task execution state
 * - Moves task to appropriate column (trial/cursed)
 * 
 * @param taskId - Task database ID
 * @param sessionId - Session database ID
 * @param opencodeSessionId - OpenCode SDK session ID
 * @param directory - Repository directory path
 */
export async function handleSessionCompletion(
  taskId: string,
  sessionId: string,
  opencodeSessionId: string,
  directory: string
): Promise<void> {
  // Check session completion - must use same directory as session creation
  const result = await isSessionComplete(opencodeSessionId, directory);

  if (!result.complete) {
    // Not complete yet, nothing to do
    return;
  }

  // Create Effect program to update database
  const program = Effect.gen(function* () {
    if (result.success) {
      // Success path: move to trial, mark completed
      yield* OpencodeSessions.completeSession(sessionId);
      yield* Tasks.updateTask(taskId, {
        status: "trial",
        executionState: "awaiting_review",
      });

      // Post success comment
      const commentText = `✓ Invocation execution completed successfully.\n\n${result.summary || "Task finished."}\n\nReview the changes and provide feedback if needed.`;
      yield* Comments.createAgentComment(taskId, commentText, "OpenCode Agent");
    } else {
      // Error path: move to cursed, mark error
      yield* OpencodeSessions.errorSession(
        sessionId,
        result.error || "Unknown error"
      );
      yield* Tasks.updateTask(taskId, {
        status: "cursed",
        executionState: "error",
      });

      // Post error comment
      const commentText = `✗ Invocation execution failed.\n\n**Error:** ${result.error || "Unknown error"}\n\nPlease review the error and try again.`;
      yield* Comments.createAgentComment(taskId, commentText, "OpenCode Agent");
    }
  });

  // Run the program
  await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        console.error("Failed to handle session completion:", error);
        return Effect.void;
      })
    )
  );
}

/**
 * Handle session question/user input needed.
 * 
 * Posts agent comment asking for clarification.
 */
export async function handleSessionQuestion(
  taskId: string,
  question: string
): Promise<void> {
  const program = Effect.gen(function* () {
    const commentText = `❓ **Question from OpenCode Agent:**\n\n${question}\n\nPlease respond in the comments to continue execution.`;
    yield* Comments.createAgentComment(taskId, commentText, "OpenCode Agent");
  });

  await Effect.runPromise(
    program.pipe(
      Effect.provide(DrizzleLive),
      Effect.catchAll((error) => {
        console.error("Failed to post question comment:", error);
        return Effect.void;
      })
    )
  );
}
