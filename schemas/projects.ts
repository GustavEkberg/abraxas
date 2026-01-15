import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { user } from "./auth"

/**
 * Projects table - each project has its own board and repository connection.
 */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  // GitHub repository URL (e.g., https://github.com/owner/repo)
  repositoryUrl: text("repository_url").notNull(),
  githubToken: text("github_token").notNull(),
  agentsMdContent: text("agents_md_content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
