import { Data } from "effect"

/**
 * Database connection error.
 */
export class DatabaseConnectionError extends Data.TaggedError(
  "DatabaseConnectionError"
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Database query error.
 */
export class DatabaseQueryError extends Data.TaggedError("DatabaseQueryError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Record not found error.
 */
export class RecordNotFoundError extends Data.TaggedError(
  "RecordNotFoundError"
)<{
  readonly message: string
  readonly table: string
  readonly id?: string
}> {}

/**
 * Validation error for database operations.
 */
export class DatabaseValidationError extends Data.TaggedError(
  "DatabaseValidationError"
)<{
  readonly message: string
  readonly field?: string
}> {}

export type DatabaseError =
  | DatabaseConnectionError
  | DatabaseQueryError
  | RecordNotFoundError
  | DatabaseValidationError
