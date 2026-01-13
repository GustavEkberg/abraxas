import { Effect } from "effect"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { comments, type Comment, type NewComment } from "@/schemas"
import { DatabaseQueryError, type DatabaseError } from "@/lib/db/errors"

/**
 * List all comments for a task.
 */
export const listCommentsByTaskId = (
  taskId: string
): Effect.Effect<Comment[], DatabaseError, never> =>
  Effect.tryPromise({
    try: () =>
      db.query.comments.findMany({
        where: eq(comments.taskId, taskId),
        orderBy: (comments, { asc }) => [asc(comments.createdAt)],
      }),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to list comments",
        cause: error,
      }),
  })

/**
 * Create new comment.
 */
export const createComment = (
  data: NewComment
): Effect.Effect<Comment, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      const [comment] = await db.insert(comments).values(data).returning()
      return comment
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to create comment",
        cause: error,
      }),
  })

/**
 * Create user comment.
 */
export const createUserComment = (
  taskId: string,
  userId: string,
  content: string
): Effect.Effect<Comment, DatabaseError, never> =>
  createComment({
    taskId,
    userId,
    content,
    isAgentComment: false,
  })

/**
 * Create agent comment.
 */
export const createAgentComment = (
  taskId: string,
  content: string,
  agentName?: string
): Effect.Effect<Comment, DatabaseError, never> =>
  createComment({
    taskId,
    content,
    isAgentComment: true,
    agentName: agentName ?? "OpenCode Agent",
  })

/**
 * Delete comment.
 */
export const deleteComment = (
  id: string
): Effect.Effect<void, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      await db.delete(comments).where(eq(comments.id, id))
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to delete comment",
        cause: error,
      }),
  })
