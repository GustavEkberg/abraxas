import { Effect } from "effect";
import { eq, asc } from "drizzle-orm";
import { DrizzleService } from "@/lib/db/drizzle-layer";
import { comments, type Comment, type NewComment } from "@/schemas";
import type { DatabaseError } from "@/lib/db/errors";

/**
 * List all comments for a task.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const listCommentsByTaskId = (taskId: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const commentList = yield* db.query.comments.findMany({
      where: eq(comments.taskId, taskId),
      orderBy: asc(comments.createdAt),
    });

    return commentList;
  });

/**
 * Create new comment.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const createComment = (data: NewComment) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const [comment] = yield* db.insert(comments).values(data).returning();

    return comment;
  });

/**
 * Create user comment.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const createUserComment = (
  taskId: string,
  userId: string,
  content: string
) =>
  createComment({
    taskId,
    userId,
    content,
    isAgentComment: false,
  });

/**
 * Create agent comment.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const createAgentComment = (
  taskId: string,
  content: string,
  agentName?: string
) =>
  createComment({
    taskId,
    content,
    isAgentComment: true,
    agentName: agentName ?? "Abraxas",
  });

/**
 * Delete comment.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const deleteComment = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    yield* db.delete(comments).where(eq(comments.id, id));
  })
