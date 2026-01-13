import { Config, Effect } from "effect"

/**
 * Application configuration with type-safe environment variable validation.
 * All required environment variables are validated at startup.
 */
export const AppConfig = Effect.all({
  databaseUrl: Config.string("DATABASE_URL"),
  nodeEnv: Config.string("NODE_ENV").pipe(Config.withDefault("development")),
  betterAuthSecret: Config.string("BETTER_AUTH_SECRET"),
  appUrl: Config.string("NEXT_PUBLIC_APP_URL").pipe(
    Config.withDefault("http://localhost:3000")
  ),
})

export type AppConfigType = Effect.Effect.Success<typeof AppConfig>
