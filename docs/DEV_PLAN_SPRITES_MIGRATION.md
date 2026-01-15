# Sprites.dev Integration Plan

Replace local OpenCode server with remote Sprites.dev execution.

## Architecture Decisions
- **Fresh Sprite per task** - Create new Sprite, destroy after completion
- **Webhook callbacks** - Sprite calls Abraxas API on completion/error/question
- **GH_TOKEN via env** - Pass GitHub token as environment variable

## Execution Flow

```
1. Task dragged to "The Ritual"
2. Create Sprite: abraxas-task-{taskId}-{timestamp}
3. In Sprite: clone repo → run `opencode "{prompt}"` directly
4. OpenCode completes → callback script sends webhook
5. Webhook handler updates task status, posts comments
6. Destroy Sprite
```

## New Files

### `/lib/sprites/client.ts`
Sprites API client wrapper with Effect:
- `createSprite(name, env)` - Create sprite with environment
- `destroySprite(name)` - Clean up sprite
- `execCommand(name, cmd)` - Execute command in sprite

### `/lib/sprites/lifecycle.ts`
Sprite lifecycle for tasks:
- `spawnSpriteForTask(task, project)` - Create sprite with GH_TOKEN, webhook URL
- `destroySpriteForTask(spriteName)` - Cleanup

### `/lib/sprites/remote-execution.ts`
Execute task workflow inside Sprite:
1. Clone repo via `https://${GH_TOKEN}@github.com/...`
2. Run OpenCode directly: `opencode "{prompt}"` (deps pre-installed)
3. On exit, send webhook with result

### `/lib/sprites/callback-script.ts`
Generate wrapper script that:
- Runs `opencode "{prompt}"` and captures exit code
- Sends HMAC-signed webhook on completion/error
- Parses OpenCode output for summary/stats if available

### `/app/api/webhooks/sprite/[sessionId]/route.ts`
Webhook handler:
```typescript
POST /api/webhooks/sprite/[sessionId]
Body: { type: 'completed'|'error'|'question', taskId, summary?, error?, question?, stats? }
Header: X-Webhook-Signature: sha256=<hmac>
```
- Verify signature against stored webhookSecret
- Update task status (trial/cursed)
- Post agent comment
- Destroy sprite

### `/lib/sprites/cleanup.ts`
Background cleanup job:
- Find sessions older than 1 hour still in_progress
- Destroy stale sprites
- Mark sessions as timeout error

## Schema Changes

**`/schemas/opencode-sessions.ts`** - Add fields:
```typescript
spriteName: text("sprite_name"),
webhookSecret: text("webhook_secret"),
executionMode: text("execution_mode").default("local"), // 'local' | 'sprite'
```

## Modified Files

**`/app/api/rituals/[id]/tasks/[taskId]/execute/route.ts`**
- Check `SPRITES_TOKEN` env to determine mode
- If sprite mode: spawn sprite, create session with webhook secret, fire-and-forget execution
- Webhook handles completion instead of session watcher

## Environment Variables

```bash
SPRITES_TOKEN=your-sprites-api-token
WEBHOOK_BASE_URL=https://your-app.vercel.app
SPRITE_TIMEOUT_MS=3600000  # 1 hour
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

## Implementation Order

1. Sprites client (`/lib/sprites/client.ts`)
2. Schema updates + migration
3. Webhook handler + callback script
4. Remote execution service
5. Execute API mode selection
6. Cleanup job

## Verification

1. Set `SPRITES_TOKEN` in env
2. Drag task to "The Ritual"
3. Verify Sprite created (check Sprites.dev dashboard)
4. Verify repo cloned and OpenCode running
5. Verify webhook received on completion
6. Verify task moved to "Trial" with agent comment
7. Verify Sprite destroyed
