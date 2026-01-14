import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core"
import { tasks } from "./tasks"

/**
 * Session status for tracking OpenCode execution.
 */
export const sessionStatusEnum = pgEnum("session_status", [
  "pending",
  "in_progress",
  "completed",
  "error",
])

/**
 * OpenCode sessions table - tracks OpenCode execution sessions for tasks.
 */
export const opencodeSessions = pgTable("opencode_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  sessionId: text("session_id"),
  status: sessionStatusEnum("status").notNull().default("pending"),
  branchName: text("branch_name"),
  pullRequestUrl: text("pull_request_url"),
  errorMessage: text("error_message"),
  logs: text("logs"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
})

export type OpencodeSession = typeof opencodeSessions.$inferSelect
export type NewOpencodeSession = typeof opencodeSessions.$inferInsert
export type SessionStatus = typeof opencodeSessions.status.enumValues[number]
