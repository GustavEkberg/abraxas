import { createAuthClient } from "better-auth/react"
import { magicLinkClient } from "better-auth/client/plugins"

/**
 * Better Auth client for use in React components.
 * Provides hooks and utilities for authentication.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [magicLinkClient()],
})

export const { signIn, signOut, useSession } = authClient
