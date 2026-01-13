import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core"
import { tasks } from "./tasks"
import { user } from "./auth"

/**
 * Comments table - supports both user and agent comments on tasks.
 * Polymorphic: either userId or isAgentComment is set.
 */
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  isAgentComment: boolean("is_agent_comment").notNull().default(false),
  agentName: text("agent_name"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
