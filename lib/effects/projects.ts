import { Effect } from "effect"
import { eq, desc } from "drizzle-orm"
import { DrizzleService } from "@/lib/db/drizzle-layer"
import { projects, type Project, type NewProject } from "@/schemas"
import {
  RecordNotFoundError,
  type DatabaseError,
} from "@/lib/db/errors"

/**
 * Get project by ID.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const getProjectById = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const project = yield* db.query.projects.findFirst({
      where: eq(projects.id, id),
    })

    if (!project) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `Project not found with id: ${id}`,
          table: "projects",
          id,
        })
      )
    }

    return project
  })

/**
 * List all projects for a user.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const listProjectsByUserId = (userId: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const projectList = yield* db.query.projects.findMany({
      where: eq(projects.userId, userId),
      orderBy: desc(projects.createdAt),
    })

    return projectList
  })

/**
 * Create new project.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const createProject = (data: NewProject) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const [project] = yield* db.insert(projects).values(data).returning()

    return project
  })

/**
 * Update project.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const updateProject = (id: string, data: Partial<NewProject>) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const [project] = yield* db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning()

    if (!project) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `Project not found with id: ${id}`,
          table: "projects",
          id,
        })
      )
    }

    return project
  })

/**
 * Delete project.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const deleteProject = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    yield* db.delete(projects).where(eq(projects.id, id))
  })
