import { Effect } from "effect";
import { DrizzleLive } from "@/lib/db/drizzle-layer";
import * as Tasks from "@/lib/effects/tasks";
import * as Comments from "@/lib/effects/comments";
import * as OpencodeSessions from "@/lib/effects/opencode-sessions";
import { monitorSession, type SessionProgressEvent } from "./session-monitor";

/**
 * Active session watchers.
 * Maps sessionId -> abort controller for canceling watchers.
 */
const activeWatchers = new Map<string, AbortController>();

/**
 * Start monitoring an OpenCode session in the background.
 * 
 * Subscribes to session events and automatically updates the database
 * when the session completes, errors, or needs user input.
 * 
 * @param taskId - Task database ID
 * @param sessionId - Session database ID
 * @param opencodeSessionId - OpenCode SDK session ID
 * @param directory - Repository directory path
 */
export function startSessionWatcher(
  taskId: string,
  sessionId: string,
  opencodeSessionId: string,
  directory: string
): void {
  // Don't start multiple watchers for the same session
  if (activeWatchers.has(sessionId)) {
    console.log(`Watcher already active for session ${sessionId}`);
    return;
  }

  const abortController = new AbortController();
  activeWatchers.set(sessionId, abortController);

  // Start monitoring in background (don't await)
  (async () => {
    try {
      console.log(`Starting watcher for session ${opencodeSessionId}`);

      // Track if we've already posted a question comment
      const postedQuestions = new Set<string>();

      const result = await monitorSession(
        opencodeSessionId,
        directory,
        (event: SessionProgressEvent) => {
          // Handle progress events
          if (event.type === "status") {
            console.log(`Session ${opencodeSessionId} status: ${event.status}`);
          } else if (event.type === "question") {
            // Post question as comment (only once per unique question)
            if (!postedQuestions.has(event.question)) {
              postedQuestions.add(event.question);
              handleSessionQuestion(taskId, event.question).catch((error) => {
                console.error("Failed to post question comment:", error);
              });
            }
          } else if (event.type === "error") {
            console.error(`Session ${opencodeSessionId} error:`, event.error);
          }

          // Check if watcher was canceled
          if (abortController.signal.aborted) {
            throw new Error("Watcher canceled");
          }
        }
      );

      // Session completed - update database
      console.log(`Session ${opencodeSessionId} completed:`, result);
      await handleSessionCompletion(taskId, sessionId, result);
    } catch (error) {
      if (error instanceof Error && error.message === "Watcher canceled") {
        console.log(`Watcher canceled for session ${sessionId}`);
      } else {
        console.error(`Watcher error for session ${sessionId}:`, error);

        // Mark session as errored in database
        await handleSessionCompletion(taskId, sessionId, {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }).catch((err) => {
          console.error("Failed to handle watcher error:", err);
        });
      }
    } finally {
      // Clean up
      activeWatchers.delete(sessionId);
      console.log(`Watcher stopped for session ${sessionId}`);
    }
  })();
}

/**
 * Stop monitoring a session.
 * 
 * @param sessionId - Session database ID
 */
export function stopSessionWatcher(sessionId: string): void {
  const controller = activeWatchers.get(sessionId);
  if (controller) {
    controller.abort();
    activeWatchers.delete(sessionId);
  }
}

/**
 * Check if a session is being watched.
 * 
 * @param sessionId - Session database ID
 */
export function isSessionWatched(sessionId: string): boolean {
  return activeWatchers.has(sessionId);
}

/**
 * Handle session completion.
 * 
 * Updates session and task status in database, posts completion comment.
 */
async function handleSessionCompletion(
  taskId: string,
  sessionId: string,
  result: { success: boolean; summary?: string; error?: string; }
): Promise<void> {
  const program = Effect.gen(function* () {
    if (result.success) {
      // Success path: move to trial, mark completed
      yield* OpencodeSessions.completeSession(sessionId);
      yield* Tasks.updateTask(taskId, {
        status: "trial",
        executionState: "awaiting_review",
      });

      // Post success comment
      const commentText = `✓ Invocation execution completed successfully.\n\n${result.summary || "Task finished."}`;
      yield* Comments.createAgentComment(taskId, commentText, "Abraxas");
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
      yield* Comments.createAgentComment(taskId, commentText, "Abraxas");
    }
  });

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
 * Handle session question - posts comment asking for clarification.
 */
async function handleSessionQuestion(
  taskId: string,
  question: string
): Promise<void> {
  const program = Effect.gen(function* () {
    const commentText = `❓ **Question from Abraxas:**\n\n${question}\n\nPlease respond in the comments to continue execution.`;
    yield* Comments.createAgentComment(taskId, commentText, "Abraxas");
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
