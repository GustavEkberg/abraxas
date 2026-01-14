CREATE TYPE "public"."task_model" AS ENUM('grok-1', 'claude-sonnet-4-5', 'claude-haiku-4-5');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('bug', 'feature', 'plan', 'other');--> statement-breakpoint
ALTER TYPE "public"."task_execution_state" ADD VALUE 'awaiting_review' BEFORE 'completed';--> statement-breakpoint
ALTER TABLE "sprite_sessions" RENAME TO "opencode_sessions";--> statement-breakpoint
ALTER TABLE "opencode_sessions" DROP CONSTRAINT "sprite_sessions_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "type" "task_type" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "model" "task_model" DEFAULT 'grok-1' NOT NULL;--> statement-breakpoint
ALTER TABLE "opencode_sessions" ADD CONSTRAINT "opencode_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;