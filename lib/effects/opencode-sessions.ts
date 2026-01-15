import { Effect } from "effect";
import { eq, desc } from "drizzle-orm";
import { DrizzleService } from "@/lib/db/drizzle-layer";
import {
  opencodeSessions,
  type NewOpencodeSession,
  type SessionStatus,
} from "@/schemas";
import { RecordNotFoundError } from "@/lib/db/errors";

/**
 * Get OpenCode session by ID.
 */
export const getSessionById = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const session = yield* db.query.opencodeSessions.findFirst({
      where: eq(opencodeSessions.id, id),
    });

    if (!session) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `OpenCode session not found with id: ${id}`,
          table: "opencode_sessions",
          id,
        })
      );
    }

    return session;
  });

/**
 * Get OpenCode session by OpenCode SDK session ID.
 */
export const getSessionByOpencodeId = (sessionId: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const session = yield* db.query.opencodeSessions.findFirst({
      where: eq(opencodeSessions.sessionId, sessionId),
    });

    if (!session) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `OpenCode session not found with sessionId: ${sessionId}`,
          table: "opencode_sessions",
          id: sessionId,
        })
      );
    }

    return session;
  });

/**
 * Get the most recent OpenCode session for a task.
 */
export const getLatestSessionByTaskId = (taskId: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const session = yield* db.query.opencodeSessions.findFirst({
      where: eq(opencodeSessions.taskId, taskId),
      orderBy: desc(opencodeSessions.createdAt),
    });

    if (!session) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `No OpenCode session found for task: ${taskId}`,
          table: "opencode_sessions",
          id: taskId,
        })
      );
    }

    return session;
  });

/**
 * List all OpenCode sessions for a task.
 */
export const listSessionsByTaskId = (taskId: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const sessionList = yield* db.query.opencodeSessions.findMany({
      where: eq(opencodeSessions.taskId, taskId),
      orderBy: desc(opencodeSessions.createdAt),
    });

    return sessionList;
  });

/**
 * Create new OpenCode session.
 */
export const createSession = (data: NewOpencodeSession) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const [session] = yield* db
      .insert(opencodeSessions)
      .values(data)
      .returning();

    return session;
  });

/**
 * Update OpenCode session.
 */
export const updateSession = (id: string, data: Partial<NewOpencodeSession>) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const [session] = yield* db
      .update(opencodeSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(opencodeSessions.id, id))
      .returning();

    if (!session) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `OpenCode session not found with id: ${id}`,
          table: "opencode_sessions",
          id,
        })
      );
    }

    return session;
  });

/**
 * Update OpenCode session status.
 */
export const updateSessionStatus = (id: string, status: SessionStatus) =>
  updateSession(id, { status, updatedAt: new Date() });

/**
 * Mark OpenCode session as completed.
 */
export const completeSession = (
  id: string,
  pullRequestUrl?: string,
  branchName?: string
) =>
  updateSession(id, {
    status: "completed",
    completedAt: new Date(),
    pullRequestUrl,
    branchName,
  });

/**
 * Mark OpenCode session as errored.
 */
export const errorSession = (id: string, errorMessage: string) =>
  updateSession(id, {
    status: "error",
    completedAt: new Date(),
    errorMessage,
  });

/**
 * Update session statistics (message count and token usage).
 */
export const updateSessionStats = (
  id: string,
  messageCount: number,
  inputTokens: number,
  outputTokens: number
) =>
  updateSession(id, {
    messageCount,
    inputTokens,
    outputTokens,
  });

/**
 * Delete OpenCode session.
 */
export const deleteSession = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    yield* db.delete(opencodeSessions).where(eq(opencodeSessions.id, id));
  })
