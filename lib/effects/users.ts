import { Effect } from "effect"
import { eq } from "drizzle-orm"
import { DrizzleService } from "@/lib/db/drizzle-layer"
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
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const getUserById = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const foundUser = yield* db.query.user.findFirst({
      where: eq(user.id, id),
    })

    if (!foundUser) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `User not found with id: ${id}`,
          table: "user",
          id,
        })
      )
    }

    return foundUser
  })

/**
 * Get user by email.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const getUserByEmail = (email: string) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const foundUser = yield* db.query.user.findFirst({
      where: eq(user.email, email),
    })

    if (!foundUser) {
      return yield* Effect.fail(
        new RecordNotFoundError({
          message: `User not found with email: ${email}`,
          table: "user",
        })
      )
    }

    return foundUser
  })

/**
 * Create new user.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const createUser = (data: NewUser) =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const [newUser] = yield* db.insert(user).values(data).returning()

    return newUser
  })

/**
 * List all users.
 * 
 * Drizzle queries return Effect automatically when using @effect/sql-drizzle.
 */
export const listUsers = () =>
  Effect.gen(function* () {
    const db = yield* DrizzleService

    const users = yield* db.query.user.findMany()

    return users
  })
