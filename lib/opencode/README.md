# OpenCode Integration

Abraxas integrates with OpenCode SDK to execute tasks autonomously using AI.

## Prerequisites

1. **Install OpenCode** globally:
   ```bash
   npm install -g opencode
   ```

2. **Start OpenCode server** (required before using Abraxas):
   ```bash
   opencode serve --port 4096
   ```
   
   Keep this running in a separate terminal while using Abraxas.

3. **Install Abraxas agent** (automatically installed during setup):
   The `abraxas-task-executor` agent is installed to `~/.config/opencode/agent/`.
   
   To manually install:
   ```bash
   cp lib/opencode/abraxas-agent.md ~/.config/opencode/agent/abraxas-task-executor.md
   ```

## Environment Variables

- `OPENCODE_SERVER_URL` - URL of OpenCode server (default: `http://localhost:4096`)

## How It Works

1. User drags a task card to "The Ritual" column
2. Abraxas creates an OpenCode session with task context:
   - Task title and description
   - All comment history (for feedback iterations)
3. OpenCode executes using the `abraxas-task-executor` agent
4. OpenCode reads the repository's `AGENTS.md` automatically
5. On completion/error, Abraxas posts an agent comment with results
6. Task auto-moves to "The Trial" (success) or "Cursed" (error)

## Files

- `client.ts` - OpenCode SDK client configuration
- `task-execution.ts` - Task execution logic with session management
- `abraxas-agent.md` - Agent configuration for OpenCode

## Development

To test OpenCode integration locally:

1. Start OpenCode server: `opencode serve --port 4096`
2. Start Abraxas dev server: `pnpm dev`
3. Create a ritual (project) pointing to a local repository
4. Create a task and drag it to "The Ritual"
5. OpenCode will execute the task using the repository's AGENTS.md
