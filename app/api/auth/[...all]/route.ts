import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

/**
 * Better Auth API route handler.
 * Handles all auth-related endpoints via catch-all route.
 */
export const { GET, POST } = toNextJsHandler(auth)
