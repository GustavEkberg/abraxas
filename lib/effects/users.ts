import { Effect } from "effect"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { user } from "@/schemas/auth"
import {
  DatabaseQueryError,
  RecordNotFoundError,
  type DatabaseError,
} from "@/lib/db/errors"

export type User = typeof user.$inferSelect
export type NewUser = typeof user.$inferInsert

/**
 * Get user by ID.
 */
export const getUserById = (
  id: string
): Effect.Effect<User, DatabaseError, never> =>
  Effect.tryPromise({
    try: () => db.query.user.findFirst({ where: eq(user.id, id) }),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to fetch user",
        cause: error,
      }),
  }).pipe(
    Effect.flatMap((foundUser) =>
      foundUser
        ? Effect.succeed(foundUser)
        : Effect.fail(
            new RecordNotFoundError({
              message: `User not found with id: ${id}`,
              table: "user",
              id,
            })
          )
    )
  )

/**
 * Get user by email.
 */
export const getUserByEmail = (
  email: string
): Effect.Effect<User, DatabaseError, never> =>
  Effect.tryPromise({
    try: () => db.query.user.findFirst({ where: eq(user.email, email) }),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to fetch user by email",
        cause: error,
      }),
  }).pipe(
    Effect.flatMap((foundUser) =>
      foundUser
        ? Effect.succeed(foundUser)
        : Effect.fail(
            new RecordNotFoundError({
              message: `User not found with email: ${email}`,
              table: "user",
            })
          )
    )
  )

/**
 * Create new user.
 */
export const createUser = (
  data: NewUser
): Effect.Effect<User, DatabaseError, never> =>
  Effect.tryPromise({
    try: async () => {
      const [newUser] = await db.insert(user).values(data).returning()
      return newUser
    },
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to create user",
        cause: error,
      }),
  })

/**
 * List all users.
 */
export const listUsers = (): Effect.Effect<User[], DatabaseError, never> =>
  Effect.tryPromise({
    try: () => db.query.user.findMany(),
    catch: (error) =>
      new DatabaseQueryError({
        message: "Failed to list users",
        cause: error,
      }),
  })
