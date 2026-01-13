import { Effect } from "effect"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { projects, type Project, type NewProject } from "@/schemas"
import {
  DatabaseQueryError,
  RecordNotFoundError,
  type DatabaseError,
} from "@/lib/db/errors"

/**
 * Get project by ID.
 */
export const getProjectById = (
  id: string
): Effect.Effect<Project, DatabaseError, never> =>
  Effect.tryPromise({
    try: () => db.query.projects.findFirst({ where: eq(projects.id, id) }),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to fetch project",
        cause: error,
      }),
  }).pipe(
    Effect.flatMap((project) =>
      project
        ? Effect.succeed(project)
        : Effect.fail(
            new RecordNotFoundError({
              message: `Project not found with id: ${id}`,
              table: "projects",
              id,
            })
          )
    )
  )

/**
 * List all projects for a user.
 */
export const listProjectsByUserId = (
  userId: string
): Effect.Effect<Project[], DatabaseError, never> =>
  Effect.tryPromise({
    try: () =>
      db.query.projects.findMany({
        where: eq(projects.userId, userId),
        orderBy: (projects, { desc }) => [desc(projects.createdAt)],
      }),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to list projects",
        cause: error,
      }),
  })

/**
 * Create new project.
 */
export const createProject = (
  data: NewProject
): Effect.Effect<Project, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      const [project] = await db.insert(projects).values(data).returning()
      return project
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to create project",
        cause: error,
      }),
  })

/**
 * Update project.
 */
export const updateProject = (
  id: string,
  data: Partial<NewProject>
): Effect.Effect<Project, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      const [project] = await db
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning()
      return project
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to update project",
        cause: error,
      }),
  }).pipe(
    Effect.flatMap((project) =>
      project
        ? Effect.succeed(project)
        : Effect.fail(
            new RecordNotFoundError({
              message: `Project not found with id: ${id}`,
              table: "projects",
              id,
            })
          )
    )
  )

/**
 * Delete project.
 */
export const deleteProject = (
  id: string
): Effect.Effect<void, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      await db.delete(projects).where(eq(projects.id, id))
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to delete project",
        cause: error,
      }),
  })
