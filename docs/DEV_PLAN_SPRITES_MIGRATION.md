# Sprites.dev Integration Plan

**Status: IMPLEMENTED** (code complete, pending database migration and testing)

Replace local OpenCode server with remote Sprites.dev execution.

## API Documentation
- Sprites API: https://sprites.dev/api
- Base URL: `https://api.sprites.dev/v1`
- Auth: Bearer token via `SPRITES_TOKEN`

## Architecture Decisions
- **Fresh sprites with setup script** - Each task gets a new sprite, setup script installs opencode
- **Webhook callbacks** - Sprite calls Abraxas API on completion/error/question
- **GH_TOKEN per project** - GitHub token stored in projects table
- **Cloud-only execution** - Local mode removed, all execution via Sprites

## Execution Flow

```
1. Task dragged to "The Ritual"
2. Create Sprite: abraxas-{taskId}-{timestamp}
3. Run setup script (installs opencode)
4. Clone repo via https://{token}@github.com/...
5. Run opencode with task prompt
6. On completion/error: send HMAC-signed webhook
7. Webhook handler updates task, posts comment
8. Destroy sprite
```

## Schema Changes

**`/schemas/projects.ts`**:
- Removed `repositoryPath` (local path)
- Added `repositoryUrl` (required, GitHub URL)

**`/schemas/opencode-sessions.ts`** - Added fields:
```typescript
spriteName: text("sprite_name"),
webhookSecret: text("webhook_secret"),
executionMode: executionModeEnum("execution_mode"), // enum: 'local' | 'sprite'
```

## Files Created

| File | Purpose |
|------|---------|
| `/lib/sprites/client.ts` | Effect-based Sprites API client |
| `/lib/sprites/lifecycle.ts` | Sprite spawning and execution orchestration |
| `/lib/sprites/callback-script.ts` | Bash script generator with setup + webhook |
| `/lib/sprites/cleanup.ts` | Stale session cleanup |
| `/app/api/webhooks/sprite/[sessionId]/route.ts` | Webhook handler |
| `/app/api/cron/cleanup/route.ts` | Cron endpoint for cleanup |

## Files Modified

| File | Changes |
|------|---------|
| `/app/api/rituals/[id]/tasks/[taskId]/execute/route.ts` | Simplified to sprite-only execution |
| `/lib/opencode/task-execution.ts` | Removed local mode, kept `buildTaskPrompt` |
| `/components/rituals/create-ritual-dialog.tsx` | Changed to `repositoryUrl` |
| `/app/(dashboard)/page.tsx` | Changed to `repositoryUrl` |
| `/app/(dashboard)/rituals/[id]/page.tsx` | Changed to `repositoryUrl` |
| `/app/api/rituals/route.ts` | Changed to `repositoryUrl` |
| `/app/api/rituals/[id]/route.ts` | Changed to `repositoryUrl` |

## Environment Variables

```bash
# Required
SPRITES_TOKEN=your-sprites-api-token
WEBHOOK_BASE_URL=https://your-app.vercel.app

# Optional
SPRITE_TIMEOUT_MS=3600000  # Default: 1 hour
SPRITE_SETUP_SCRIPT="..."  # Custom setup script (default installs opencode via npm)
CRON_SECRET=...            # Auth for cleanup cron endpoint
```

## Webhook Payloads

**Completion:**
```json
{"type":"completed","sessionId":"...","taskId":"...","summary":"...","stats":{"messageCount":15,"inputTokens":12500,"outputTokens":8700}}
```

**Error:**
```json
{"type":"error","sessionId":"...","taskId":"...","error":"Git push failed"}
```

**Question:**
```json
{"type":"question","sessionId":"...","taskId":"...","question":"Should I proceed?"}
```

## Prerequisites Before Testing

1. **Database migration** - New schema fields:
   - Remove `projects.repositoryPath`
   - Add `projects.repositoryUrl` (required)
   - Add `opencodeSessions.spriteName`
   - Add `opencodeSessions.webhookSecret`
   - Add `opencodeSessions.executionMode` enum
   - Add `execution_mode` enum type

2. **Environment setup**:
   - Set `SPRITES_TOKEN` from sprites.dev
   - Set `WEBHOOK_BASE_URL` to deployed app URL

3. **Update existing projects**:
   - Add `repositoryUrl` for any existing projects

## Verification Steps

1. Set environment variables
2. Create/update a ritual with GitHub URL
3. Create a task and drag to "The Ritual"
4. Verify in Sprites.dev dashboard:
   - Sprite created
   - Setup script runs
   - Repo cloned
   - opencode executes
5. Verify webhook received
6. Verify task moved to "Trial" with agent comment
7. Verify sprite destroyed
