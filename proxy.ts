import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

/**
 * Proxy for protected routes.
 * Redirects unauthenticated users to login page.
 * Automatically logs out users if session is invalid.
 */
export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/verify")

  // Redirect authenticated users away from auth pages
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Redirect unauthenticated users to login and clear cookies
  if (!session && !isAuthPage) {
    const response = NextResponse.redirect(new URL("/login", request.url))
    // Clear auth cookies to ensure clean logout
    response.cookies.delete("better-auth.session_token")
    response.cookies.delete("better-auth.session_data")
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
  ],
}
