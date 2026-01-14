ALTER TABLE "opencode_sessions" ADD COLUMN "message_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "opencode_sessions" ADD COLUMN "input_tokens" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "opencode_sessions" ADD COLUMN "output_tokens" integer DEFAULT 0;