import { Effect } from "effect"
import { eq, and, desc } from "drizzle-orm"
import { DrizzleService } from "@/lib/db/drizzle-layer"
import {
  tasks,
  type Task,
  type NewTask,
  type TaskStatus,
  type TaskExecutionState,
} from "@/schemas"
import {
  RecordNotFoundError,
  type DatabaseError,
} from "@/lib/db/errors"

/**
 * Get task by ID.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const getTaskById = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const task = yield* db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    })

    if (!task) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `Task not found with id: ${id}`,
          table: "tasks",
          id,
        })
      )
    }

    return task
  })

/**
 * List all tasks for a project.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const listTasksByProjectId = (projectId: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const taskList = yield* db.query.tasks.findMany({
      where: eq(tasks.projectId, projectId),
      orderBy: desc(tasks.createdAt),
    })

    return taskList
  })

/**
 * List tasks by project and status.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const listTasksByStatus = (projectId: string, status: TaskStatus) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const taskList = yield* db.query.tasks.findMany({
      where: and(eq(tasks.projectId, projectId), eq(tasks.status, status)),
      orderBy: desc(tasks.createdAt),
    })

    return taskList
  })

/**
 * Create new task.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const createTask = (data: NewTask) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const [task] = yield* db.insert(tasks).values(data).returning()

    return task
  })

/**
 * Update task.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const updateTask = (id: string, data: Partial<NewTask>) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const [task] = yield* db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning()

    if (!task) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `Task not found with id: ${id}`,
          table: "tasks",
          id,
        })
      )
    }

    return task
  })

/**
 * Update task status (for column changes).
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const updateTaskStatus = (id: string, status: TaskStatus) =>
  updateTask(id, { status, updatedAt: new Date() })

/**
 * Update task execution state.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const updateTaskExecutionState = (
  id: string,
  executionState: TaskExecutionState
) => updateTask(id, { executionState, updatedAt: new Date() })

/**
 * Delete task.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const deleteTask = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    yield* db.delete(tasks).where(eq(tasks.id, id))
  })
