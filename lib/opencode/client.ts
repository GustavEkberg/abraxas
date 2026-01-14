import { createOpencodeClient } from "@opencode-ai/sdk";

/**
 * OpenCode client for connecting to local OpenCode server.
 * 
 * Assumes OpenCode server is already running locally.
 * User should start OpenCode server before using Abraxas:
 * 
 * ```bash
 * opencode serve --port 4096
 * ```
 * 
 * Environment variable:
 * - OPENCODE_SERVER_URL: URL of the OpenCode server (default: http://localhost:4096)
 */
export const opencodeClient = (directory?: string) => createOpencodeClient({
  baseUrl: process.env.OPENCODE_SERVER_URL || "http://localhost:4096",
  directory
})
