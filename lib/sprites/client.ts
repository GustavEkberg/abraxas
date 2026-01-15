import { Config, Effect, Data } from "effect"

/**
 * Sprites API configuration.
 */
export const SpritesConfig = Effect.all({
  token: Config.string("SPRITES_TOKEN"),
  webhookBaseUrl: Config.string("WEBHOOK_BASE_URL"),
  timeoutMs: Config.number("SPRITE_TIMEOUT_MS").pipe(
    Config.withDefault(3600000) // 1 hour
  ),
  /** Optional custom setup script. If not provided, uses default opencode installer. */
  setupScript: Config.string("SPRITE_SETUP_SCRIPT").pipe(
    Config.withDefault("")
  ),
})

export type SpritesConfigType = Effect.Effect.Success<typeof SpritesConfig>

const SPRITES_API_BASE = "https://api.sprites.dev/v1"

// --- Error Types ---

export class SpritesApiError extends Data.TaggedError("SpritesApiError")<{
  readonly message: string
  readonly status?: number
  readonly cause?: unknown
}> {}

export class SpritesNotFoundError extends Data.TaggedError("SpritesNotFoundError")<{
  readonly message: string
  readonly spriteName: string
}> {}

export class SpritesConfigError extends Data.TaggedError("SpritesConfigError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export type SpritesError = SpritesApiError | SpritesNotFoundError | SpritesConfigError

// --- Response Types ---

export interface Sprite {
  id: string
  name: string
  organization: string
  url: string
  status: "cold" | "warm" | "running"
  url_settings: {
    auth: "sprite" | "public"
  }
  created_at: string
  updated_at: string
}

export interface SpriteListEntry {
  name: string
  org_slug: string
  updated_at?: string
}

export interface SpriteListResponse {
  sprites: SpriteListEntry[]
  has_more: boolean
  next_continuation_token?: string
}

export interface ExecSession {
  id: string
  command: string
  is_active: boolean
  tty: boolean
  created?: string
  last_activity?: string
  workdir?: string
  bytes_per_second?: number
}

export interface Checkpoint {
  id: string
  create_time: string
  source_id?: string
  comment?: string
}

export interface StreamEvent {
  type: "info" | "error" | "complete"
  data?: string
  error?: string
  time?: string
}

// --- HTTP Helpers ---

const makeRequest = (
  method: string,
  path: string,
  token: string,
  body?: unknown
) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`${SPRITES_API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw { status: response.status, message: text || response.statusText }
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null
      }

      const text = await response.text()
      return text ? JSON.parse(text) : null
    },
    catch: (error) => {
      const err = error as { status?: number; message?: string }
      if (err.status === 404) {
        return new SpritesNotFoundError({
          message: `Sprite not found`,
          spriteName: path.split("/")[2] || "unknown",
        })
      }
      return new SpritesApiError({
        message: err.message || "Sprites API request failed",
        status: err.status,
        cause: error,
      })
    },
  })

const makeStreamRequest = (
  method: string,
  path: string,
  token: string,
  body?: unknown
) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`${SPRITES_API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw { status: response.status, message: text || response.statusText }
      }

      // Parse NDJSON response
      const text = await response.text()
      const events: StreamEvent[] = text
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line))

      return events
    },
    catch: (error) => {
      const err = error as { status?: number; message?: string }
      return new SpritesApiError({
        message: err.message || "Sprites API stream request failed",
        status: err.status,
        cause: error,
      })
    },
  })

// --- Sprite Management ---

/**
 * Create a new sprite.
 */
export const createSprite = (name: string, urlAuth: "sprite" | "public" = "sprite") =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    const sprite = yield* makeRequest("POST", "/sprites", config.token, {
      name,
      url_settings: { auth: urlAuth },
    })

    return sprite as Sprite
  })

/**
 * Get sprite by name.
 */
export const getSprite = (name: string) =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    const sprite = yield* makeRequest("GET", `/sprites/${name}`, config.token)

    return sprite as Sprite
  })

/**
 * List all sprites.
 */
export const listSprites = (prefix?: string, maxResults?: number) =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    const params = new URLSearchParams()
    if (prefix) params.set("prefix", prefix)
    if (maxResults) params.set("max_results", maxResults.toString())

    const queryString = params.toString()
    const path = queryString ? `/sprites?${queryString}` : "/sprites"

    const response = yield* makeRequest("GET", path, config.token)

    return response as SpriteListResponse
  })

/**
 * Destroy a sprite.
 */
export const destroySprite = (name: string) =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    yield* makeRequest("DELETE", `/sprites/${name}`, config.token)
  })

// --- Command Execution ---

/**
 * Execute a command in a sprite (non-TTY, simple HTTP POST).
 * 
 * Use this for fire-and-forget execution. For streaming output, use WebSocket.
 */
export const execCommand = (
  spriteName: string,
  command: string[],
  options?: {
    env?: Record<string, string>
    dir?: string
    stdin?: string
  }
) =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    const params = new URLSearchParams()
    command.forEach((c) => params.append("cmd", c))
    if (options?.stdin) params.set("stdin", "true")
    if (options?.dir) params.set("dir", options.dir)
    if (options?.env) {
      Object.entries(options.env).forEach(([key, value]) => {
        params.append("env", `${key}=${value}`)
      })
    }

    const path = `/sprites/${spriteName}/exec?${params.toString()}`

    const response = yield* Effect.tryPromise({
      try: async () => {
        const res = await fetch(`${SPRITES_API_BASE}${path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.token}`,
            "Content-Type": "application/octet-stream",
          },
          body: options?.stdin || undefined,
        })

        if (!res.ok) {
          const text = await res.text().catch(() => "")
          throw { status: res.status, message: text || res.statusText }
        }

        return res.text()
      },
      catch: (error) => {
        const err = error as { status?: number; message?: string }
        return new SpritesApiError({
          message: err.message || "Command execution failed",
          status: err.status,
          cause: error,
        })
      },
    })

    return response
  })

/**
 * List active exec sessions for a sprite.
 */
export const listExecSessions = (spriteName: string) =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    const sessions = yield* makeRequest(
      "GET",
      `/sprites/${spriteName}/exec`,
      config.token
    )

    return sessions as ExecSession[]
  })

/**
 * Kill an exec session.
 */
export const killExecSession = (
  spriteName: string,
  sessionId: string,
  signal?: string
) =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    const params = new URLSearchParams()
    if (signal) params.set("signal", signal)

    const queryString = params.toString()
    const path = `/sprites/${spriteName}/exec/${sessionId}/kill${queryString ? `?${queryString}` : ""}`

    const events = yield* makeStreamRequest("POST", path, config.token)

    return events
  })

// --- Checkpoints ---

/**
 * Create a checkpoint.
 */
export const createCheckpoint = (spriteName: string, comment?: string) =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    const events = yield* makeStreamRequest(
      "POST",
      `/sprites/${spriteName}/checkpoint`,
      config.token,
      comment ? { comment } : undefined
    )

    return events
  })

/**
 * List checkpoints for a sprite.
 */
export const listCheckpoints = (spriteName: string) =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    const checkpoints = yield* makeRequest(
      "GET",
      `/sprites/${spriteName}/checkpoints`,
      config.token
    )

    return checkpoints as Checkpoint[]
  })

/**
 * Get a specific checkpoint.
 */
export const getCheckpoint = (spriteName: string, checkpointId: string) =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    const checkpoint = yield* makeRequest(
      "GET",
      `/sprites/${spriteName}/checkpoints/${checkpointId}`,
      config.token
    )

    return checkpoint as Checkpoint
  })

/**
 * Restore a checkpoint.
 */
export const restoreCheckpoint = (spriteName: string, checkpointId: string) =>
  Effect.gen(function* () {
    const config = yield* SpritesConfig.pipe(
      Effect.mapError((cause) => new SpritesConfigError({
        message: "Missing SPRITES_TOKEN configuration",
        cause,
      }))
    )

    const events = yield* makeStreamRequest(
      "POST",
      `/sprites/${spriteName}/checkpoints/${checkpointId}/restore`,
      config.token
    )

    return events
  })
