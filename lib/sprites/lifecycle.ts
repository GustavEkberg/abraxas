import { Effect, Data } from "effect";
import {
  createSprite,
  destroySprite,
  execCommand,
  SpritesConfig,
  SpritesError,
} from "./client";
import {
  generateCallbackScript,
  generateWebhookSecret,
  DEFAULT_SETUP_SCRIPT,
} from "./callback-script";
import type { Task, Project } from "@/schemas";

/**
 * Error when sprite execution fails.
 */
export class SpriteExecutionError extends Data.TaggedError(
  "SpriteExecutionError"
)<{
  readonly message: string;
  readonly spriteName?: string;
  readonly cause?: unknown;
}> { }

export type SpriteLifecycleError = SpritesError | SpriteExecutionError;

/**
 * Configuration for spawning a sprite for a task.
 */
export interface SpawnSpriteConfig {
  task: Pick<Task, "id" | "title" | "description" | "type" | "branchName">;
  project: Pick<Project, "id" | "name" | "repositoryUrl" | "githubToken">;
  prompt: string;
  comments?: Array<{
    content: string;
    isAgentComment: boolean;
    agentName?: string | null;
    createdAt: Date;
  }>;
}

/**
 * Result of spawning a sprite.
 */
export interface SpawnSpriteResult {
  spriteName: string;
  webhookSecret: string;
  branchName: string;
}

/**
 * Generate a unique sprite name for a task.
 */
export function generateSpriteName(taskId: string): string {
  const timestamp = Date.now();
  // Sprite names must be alphanumeric with dashes, max 63 chars
  const shortTaskId = taskId.replace(/-/g, "").slice(0, 12);
  return `abraxas-${shortTaskId}-${timestamp}`;
}

/**
 * Generate branch name for a task.
 */
export function generateBranchName(taskId: string, taskTitle: string): string {
  const slugifiedTitle = taskTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  const shortTaskId = taskId.replace(/-/g, "").slice(0, 8);
  return `abraxas/${shortTaskId}-${slugifiedTitle}`;
}

/**
 * Spawn a sprite for task execution.
 * 
 * Creates a new sprite, restores from checkpoint, and executes the task.
 * Returns immediately after starting execution - webhook handles completion.
 */
export const spawnSpriteForTask = (config: SpawnSpriteConfig) =>
  Effect.gen(function* () {
    const spritesConfig = yield* SpritesConfig;

    const { task, project, prompt } = config;

    // Validate project has repository URL
    if (!project.repositoryUrl) {
      return yield* Effect.fail(
        new SpriteExecutionError({
          message:
            "Project does not have a repository URL configured. Required for sprite execution.",
        })
      );
    }

    const spriteName = generateSpriteName(task.id);
    const webhookSecret = generateWebhookSecret();
    // Reuse existing branch if task already has one, otherwise generate new
    const branchName = task.branchName || generateBranchName(task.id, task.title);
    // Normalize webhook base URL - remove trailing slash if present
    const baseUrl = spritesConfig.webhookBaseUrl.replace(/\/$/, "");
    const webhookUrl = `${baseUrl}/api/webhooks/sprite/${task.id}`;

    console.log(`[Sprite] Creating sprite: ${spriteName}`);
    console.log(`[Sprite] Using branch: ${branchName}${task.branchName ? " (existing)" : " (new)"}`);

    // Create the sprite
    yield* createSprite(spriteName, "sprite").pipe(
      Effect.mapError(
        (error) =>
          new SpriteExecutionError({
            message: `Failed to create sprite: ${error.message}`,
            spriteName,
            cause: error,
          })
      )
    );

    try {
      // Generate the execution script with setup phase
      // Setup script installs opencode if not using a pre-configured image
      const setupScript = spritesConfig.setupScript || DEFAULT_SETUP_SCRIPT;

      const script = generateCallbackScript({
        sessionId: task.id,
        taskId: task.id,
        webhookUrl,
        webhookSecret,
        prompt,
        repoUrl: project.repositoryUrl,
        githubToken: project.githubToken,
        branchName,
        setupScript,
      });

      // Write script to sprite and execute
      console.log(`--------------Created Sprite--------------`);
      console.log(spriteName);
      console.log(`------------------------------------------`);

      // Write the script to a file in the sprite
      yield* execCommand(spriteName, ["bash", "-c", `cat > /tmp/abraxas-run.sh`], {
        stdin: script,
      }).pipe(
        Effect.mapError(
          (error) =>
            new SpriteExecutionError({
              message: `Failed to write script: ${error.message}`,
              spriteName,
              cause: error,
            })
        )
      );

      // Make it executable
      yield* execCommand(spriteName, ["chmod", "+x", "/tmp/abraxas-run.sh"]).pipe(
        Effect.mapError(
          (error) =>
            new SpriteExecutionError({
              message: `Failed to chmod script: ${error.message}`,
              spriteName,
              cause: error,
            })
        )
      );

      // Execute the script in detached screen session to keep sprite awake
      // Using screen instead of nohup ensures the sprite sees an active process
      // The script will send a webhook when done
      yield* execCommand(spriteName, [
        "bash",
        "-c",
        "screen -dmS abraxas bash /tmp/abraxas-run.sh",
      ]).pipe(
        Effect.mapError(
          (error) =>
            new SpriteExecutionError({
              message: `Failed to start execution: ${error.message}`,
              spriteName,
              cause: error,
            })
        )
      );

      console.log(`[Sprite] Execution started for ${spriteName}`);

      return {
        spriteName,
        webhookSecret,
        branchName,
      } satisfies SpawnSpriteResult;
    } catch (error) {
      // If setup fails, destroy the sprite
      console.error(`[Sprite] Setup failed, destroying ${spriteName}:`, error);
      yield* destroySprite(spriteName).pipe(Effect.catchAll(() => Effect.void));
      throw error;
    }
  });

/**
 * Destroy a sprite for a task.
 */
export const destroySpriteForTask = (spriteName: string) =>
  Effect.gen(function* () {
    console.log(`[Sprite] Destroying sprite: ${spriteName}`);
    yield* destroySprite(spriteName);
  })
