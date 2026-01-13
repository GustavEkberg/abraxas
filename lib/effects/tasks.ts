import { Effect } from "effect"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db/client"
import {
  tasks,
  type Task,
  type NewTask,
  type TaskStatus,
  type TaskExecutionState,
} from "@/schemas"
import {
  DatabaseQueryError,
  RecordNotFoundError,
  type DatabaseError,
} from "@/lib/db/errors"

/**
 * Get task by ID.
 */
export const getTaskById = (
  id: string
): Effect.Effect<Task, DatabaseError, never> =>
  Effect.tryPromise({
    try: () => db.query.tasks.findFirst({ where: eq(tasks.id, id) }),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to fetch task",
        cause: error,
      }),
  }).pipe(
    Effect.flatMap((task) =>
      task
        ? Effect.succeed(task)
        : Effect.fail(
            new RecordNotFoundError({
              message: `Task not found with id: ${id}`,
              table: "tasks",
              id,
            })
          )
    )
  )

/**
 * List all tasks for a project.
 */
export const listTasksByProjectId = (
  projectId: string
): Effect.Effect<Task[], DatabaseError, never> =>
  Effect.tryPromise({
    try: () =>
      db.query.tasks.findMany({
        where: eq(tasks.projectId, projectId),
        orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
      }),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to list tasks",
        cause: error,
      }),
  })

/**
 * List tasks by project and status.
 */
export const listTasksByStatus = (
  projectId: string,
  status: TaskStatus
): Effect.Effect<Task[], DatabaseError, never> =>
  Effect.tryPromise({
    try: () =>
      db.query.tasks.findMany({
        where: and(eq(tasks.projectId, projectId), eq(tasks.status, status)),
        orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
      }),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to list tasks by status",
        cause: error,
      }),
  })

/**
 * Create new task.
 */
export const createTask = (
  data: NewTask
): Effect.Effect<Task, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      const [task] = await db.insert(tasks).values(data).returning()
      return task
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to create task",
        cause: error,
      }),
  })

/**
 * Update task.
 */
export const updateTask = (
  id: string,
  data: Partial<NewTask>
): Effect.Effect<Task, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      const [task] = await db
        .update(tasks)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning()
      return task
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to update task",
        cause: error,
      }),
  }).pipe(
    Effect.flatMap((task) =>
      task
        ? Effect.succeed(task)
        : Effect.fail(
            new RecordNotFoundError({
              message: `Task not found with id: ${id}`,
              table: "tasks",
              id,
            })
          )
    )
  )

/**
 * Update task status (for column changes).
 */
export const updateTaskStatus = (
  id: string,
  status: TaskStatus
): Effect.Effect<Task, DatabaseError, never> =>
  updateTask(id, { status, updatedAt: new Date() })

/**
 * Update task execution state.
 */
export const updateTaskExecutionState = (
  id: string,
  executionState: TaskExecutionState
): Effect.Effect<Task, DatabaseError, never> =>
  updateTask(id, { executionState, updatedAt: new Date() })

/**
 * Delete task.
 */
export const deleteTask = (
  id: string
): Effect.Effect<void, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      await db.delete(tasks).where(eq(tasks.id, id))
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to delete task",
        cause: error,
      }),
  })
