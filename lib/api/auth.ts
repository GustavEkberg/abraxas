import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

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

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
