import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { auth } from "@/lib/auth"
import { getUserById } from "@/lib/effects/users"
import { DrizzleLive } from "@/lib/db/drizzle-layer"
import { RecordNotFoundError } from "@/lib/db/errors"

/**
 * Authenticated user session.
 */
export interface AuthSession {
  userId: string
  user: {
    id: string
    email: string
    name?: string
  }
}

/**
 * Get authenticated session or return unauthorized response.
 * Automatically logs out users if session is invalid or user doesn't exist in database.
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const session = await requireAuth(request)
 *   if (session instanceof NextResponse) return session
 *   
 *   // Use session.userId safely
 *   const data = await fetchUserData(session.userId)
 *   return NextResponse.json(data)
 * }
 * ```
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthSession | NextResponse> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  // No session or missing user data
  if (!session?.user?.id) {
    const response = NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401 }
    )
    // Clear auth cookies to force logout
    response.cookies.delete("better-auth.session_token")
    response.cookies.delete("better-auth.session_data")
    return response
  }

  // Verify user still exists in database using Effect
  const userProgram = getUserById(session.user.id).pipe(
    Effect.catchTag("RecordNotFoundError", () =>
      Effect.succeed(null as null)
    ),
    Effect.catchAll((error) => {
      console.error("Error verifying user in requireAuth:", error)
      return Effect.succeed(null as null)
    }),
    Effect.provide(DrizzleLive)
  )

  const user = await Effect.runPromise(userProgram)

  if (!user) {
    // User no longer exists or database error - clear session and return 401
    const response = NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401 }
    )
    response.cookies.delete("better-auth.session_token")
    response.cookies.delete("better-auth.session_data")
    return response
  }

  // User exists - return session
  return {
    userId: session.user.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? undefined,
    },
  }
}

/**
 * Type guard to check if response is authentication error.
 */
export function isAuthError(
  value: AuthSession | NextResponse
): value is NextResponse {
  return value instanceof NextResponse
}
