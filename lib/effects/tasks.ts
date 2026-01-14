import { Effect } from "effect";
import { eq, and, desc } from "drizzle-orm";
import { DrizzleService } from "@/lib/db/drizzle-layer";
import {
  tasks,
  opencodeSessions,
  type NewTask,
  type TaskStatus,
  type TaskExecutionState,
} from "@/schemas";
import {
  RecordNotFoundError,
} from "@/lib/db/errors";

/**
 * Get task by ID.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const getTaskById = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const task = yield* db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });

    if (!task) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `Task not found with id: ${id}`,
          table: "tasks",
          id,
        })
      );
    }

    return task;
  });

/**
 * List all tasks for a project.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const listTasksByProjectId = (projectId: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const taskList = yield* db.query.tasks.findMany({
      where: eq(tasks.projectId, projectId),
      orderBy: desc(tasks.createdAt),
    });

    return taskList;
  });

/**
 * List all tasks for a project with their active session stats.
 * 
 * Returns tasks with messageCount, inputTokens, and outputTokens from the most recent in_progress session.
 */
export const listTasksWithStats = (projectId: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    // Get all tasks
    const taskList = yield* db.query.tasks.findMany({
      where: eq(tasks.projectId, projectId),
      orderBy: desc(tasks.createdAt),
    });

    // Get all sessions (completed and in_progress) for these tasks
    const taskIds = taskList.map((t) => t.id);
    const sessions = yield* db.query.opencodeSessions.findMany({
      where: and(
        // Include both completed and in_progress sessions
        // Filter by task IDs - we'll do this in memory since Drizzle doesn't have a clean "in" operator in relational queries
      ),
      orderBy: desc(opencodeSessions.createdAt),
    });

    // Create a map of taskId -> accumulated session stats (sum across all sessions)
    const sessionMap = new Map<string, { messageCount: number; inputTokens: number; outputTokens: number }>();
    for (const session of sessions) {
      if (taskIds.includes(session.taskId)) {
        // Accumulate stats across all sessions for this task
        const currentStats = sessionMap.get(session.taskId) || { messageCount: 0, inputTokens: 0, outputTokens: 0 };
        sessionMap.set(session.taskId, {
          messageCount: currentStats.messageCount + (session.messageCount || 0),
          inputTokens: currentStats.inputTokens + (session.inputTokens || 0),
          outputTokens: currentStats.outputTokens + (session.outputTokens || 0),
        });
      }
    }

    // Transform to include stats at the top level
    return taskList.map((task) => {
      const stats = sessionMap.get(task.id);
      return {
        ...task,
        messageCount: stats?.messageCount || 0,
        inputTokens: stats?.inputTokens || 0,
        outputTokens: stats?.outputTokens || 0,
      };
    });
  });

/**
 * List tasks by project and status.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const listTasksByStatus = (projectId: string, status: TaskStatus) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const taskList = yield* db.query.tasks.findMany({
      where: and(eq(tasks.projectId, projectId), eq(tasks.status, status)),
      orderBy: desc(tasks.createdAt),
    });

    return taskList;
  });

/**
 * Create new task.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const createTask = (data: NewTask) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const [task] = yield* db.insert(tasks).values(data).returning();

    return task;
  });

/**
 * Update task.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const updateTask = (id: string, data: Partial<NewTask>) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    const [task] = yield* db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    if (!task) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `Task not found with id: ${id}`,
          table: "tasks",
          id,
        })
      );
    }

    return task;
  });

/**
 * Update task status (for column changes).
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const updateTaskStatus = (id: string, status: TaskStatus) =>
  updateTask(id, { status, updatedAt: new Date() });

/**
 * Update task execution state.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const updateTaskExecutionState = (
  id: string,
  executionState: TaskExecutionState
) => updateTask(id, { executionState, updatedAt: new Date() });

/**
 * Delete task.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const deleteTask = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    yield* db.delete(tasks).where(eq(tasks.id, id));
  })
