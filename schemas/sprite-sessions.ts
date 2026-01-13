import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core"
import { tasks } from "./tasks"

/**
 * Session status for tracking Sprite.dev OpenCode execution.
 */
export const sessionStatusEnum = pgEnum("session_status", [
  "pending",
  "in_progress",
  "completed",
  "error",
])

/**
 * Sprite sessions table - tracks OpenCode execution sessions for tasks.
 * Stubbed for v1, will integrate with real Sprite.dev API later.
 */
export const spriteSessions = pgTable("sprite_sessions", {
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

export type SpriteSession = typeof spriteSessions.$inferSelect
export type NewSpriteSession = typeof spriteSessions.$inferInsert
export type SessionStatus = typeof spriteSessions.status.enumValues[number]
