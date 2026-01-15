CREATE TYPE "public"."execution_mode" AS ENUM('local', 'sprite');--> statement-breakpoint
ALTER TABLE "projects" RENAME COLUMN "repository_path" TO "repository_url";--> statement-breakpoint
ALTER TABLE "opencode_sessions" ADD COLUMN "sprite_name" text;--> statement-breakpoint
ALTER TABLE "opencode_sessions" ADD COLUMN "webhook_secret" text;--> statement-breakpoint
ALTER TABLE "opencode_sessions" ADD COLUMN "execution_mode" "execution_mode" DEFAULT 'local' NOT NULL;