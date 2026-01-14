import { opencodeClient } from "./client"

/**
 * Check if OpenCode server is running and accessible.
 * 
 * @returns true if server is healthy, false otherwise
 */
export async function isOpencodeServerHealthy(): Promise<boolean> {
  try {
    // Try to list sessions to verify server is up
    const response = await opencodeClient.session.list()
    return response.data !== undefined
  } catch (error) {
    console.error("OpenCode health check failed:", error)
    return false
  }
}

/**
 * Get OpenCode server URL.
 */
export function getOpencodeServerUrl(): string {
  return process.env.OPENCODE_SERVER_URL || "http://localhost:4096"
}

/**
 * Check OpenCode server health and throw helpful error if not running.
 */
export async function requireOpencodeServer(): Promise<void> {
  const healthy = await isOpencodeServerHealthy()
  if (!healthy) {
    const serverUrl = getOpencodeServerUrl()
    throw new Error(
      `OpenCode server is not running or not accessible at ${serverUrl}.\n\n` +
      `Please start OpenCode server:\n` +
      `  opencode serve --port 4096\n\n` +
      `Or set OPENCODE_SERVER_URL environment variable to the correct URL.`
    )
  }
}
