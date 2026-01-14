import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * Task status represents which mystical column the task is in.
 */
export const taskStatusEnum = pgEnum("task_status", [
  "abyss",      // The Abyss - Backlog
  "altar",      // The Altar - Ready for execution
  "ritual",     // The Ritual - Active execution
  "cursed",     // Cursed - Blocked/Error
  "trial",      // The Trial - Awaiting review
  "vanquished", // Vanquished - Completed
]);

/**
 * Task execution state.
 */
export const taskExecutionStateEnum = pgEnum("task_execution_state", [
  "idle",
  "in_progress",
  "completed",
  "error",
]);

export const taskModel = pgEnum("task_model", [
  "grok-1",
  "claude-sonnet-4-5",
  "claude-haiku-4-5"
]);

/**
 * Tasks table - individual task cards on the board.
 * Following Ralph Wiggum methodology: minimal metadata, focus on what needs done.
 */
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  model: taskModel("model").notNull().default("grok-1"),
  status: taskStatusEnum("status").notNull().default("abyss"),
  executionState: taskExecutionStateEnum("execution_state")
    .notNull()
    .default("idle"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskStatus = typeof tasks.status.enumValues[number];
export type TaskExecutionState = typeof tasks.executionState.enumValues[number];
export type TaskModel = typeof tasks.model.enumValues[number];
