# Abraxas Agent Configuration

Abraxas is a mystical project management interface that summons the power of OpenCode to solve development tasks. When tasks are dragged to "The Ritual" column, Abraxas spawns autonomous coding sessions that execute work and create pull requests.

## Project Overview

**Abraxas** is a Trello-like project management tool with AI-powered task execution:
- Minimal, occult-themed UI for managing development tasks
- Tasks progress through mystical columns from conception to completion
- Integration with Sprite.dev to spawn OpenCode sessions for autonomous task execution
- Auto-generates feature branches and pull requests
- Comment-based feedback loop between humans and agents

## Build & Development Commands

**Package Manager:** pnpm (monorepo with workspace configuration)

```bash
# Development
pnpm dev                    # Start Next.js dev server (http://localhost:3000)

# Build & Production
pnpm build                  # Production build
pnpm start                  # Start production server

# Linting
pnpm lint                   # Run ESLint on all files
pnpm lint --fix             # Auto-fix linting issues

# Type Checking
npx tsc --noEmit            # Check TypeScript types without emitting files

# Testing (when implemented)
pnpm test                   # Run all tests
pnpm test <filename>        # Run single test file
pnpm test --watch           # Run tests in watch mode
```

## Tech Stack

### Core Technologies
- **Next.js 16.1** (App Router) with Vercel deployment
- **React 19.2** with Server Components as default
- **TypeScript 5** (strict mode enabled)
- **Tailwind CSS v4** with inline @theme in globals.css (dark mode only)
- **PostgreSQL** for database (to be integrated)
- **Drizzle ORM** for database operations (to be integrated)
- **Effect** for functional programming, async operations, and error handling (to be integrated)
- **Better Auth** with magic link authentication (to be integrated)

### Additional Technologies
- **shadcn/ui** for UI components (to be integrated)
- **@dnd-kit** for drag-and-drop (to be integrated)
- **Sprite.dev API** for OpenCode session spawning (to be integrated)

## Code Style Guidelines

### TypeScript Standards
- **Strict mode enabled** - no `any` types, no type assertions (`as`)
- Use type inference where TypeScript can reliably infer types
- Define types close to usage unless shared across modules
- Prefer `unknown` over `any` with type guards
- All async operations must use Effect (when Effect is integrated)

### Import Organization
```typescript
// 1. External dependencies
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

// 2. Absolute imports from project (@/)
import { Button } from "@/components/ui/button"
import { getUserData } from "@/lib/effects/users"

// 3. Relative imports
import "./globals.css"
import { ComponentProps } from "./types"

// 4. Type-only imports use 'import type'
import type { User } from "@/types/user"
```

### Naming Conventions
- **Components**: PascalCase (`UserProfile`, `TaskCard`)
- **Files**: kebab-case for utilities, PascalCase for components (`string-utils.ts`, `Button.tsx`)
- **Functions/Variables**: camelCase (`getUserData`, `isActive`)
- **Types/Interfaces**: PascalCase (`UserData`, `ApiResponse`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)

### Component Architecture

**Server Components First:**
- Default to Server Components for all new components
- Only use Client Components when you need:
  - Event handlers (onClick, onChange, etc.)
  - Browser APIs (localStorage, window, etc.)
  - React hooks (useState, useEffect, etc.)
  - Third-party libraries requiring client-side execution
- Mark Client Components with `"use client"` directive at top of file
- Keep Client Components small and focused
- Pass data from Server Components to Client Components via props

**Component Pattern:**
```typescript
// Server Component (default)
export default async function ProjectBoard({ params }: { params: { id: string } }) {
  const project = await getProject(params.id)
  return <BoardView project={project} />
}

// Client Component (when needed)
"use client"

export function TaskCard({ task }: { task: Task }) {
  const [isEditing, setIsEditing] = useState(false)
  return <div onClick={() => setIsEditing(true)}>...</div>
}
```

## Domain Model

### Projects
- A project should be called a "Ritual" in the UI
- Multiple isolated projects, each with its own board
- Each project connects to a single repository
- Project configuration includes:
  - Project name
  - Local repository path
  - GitHub Personal Access Token
  - Project-specific AGENTS.md (stored in the repo itself)

### Tasks
- Task cards with the following structure:
  - Title (required)
  - Description (markdown, required)
  - Priority (optional: high, medium, low)
  - Labels/tags (optional)
  - Due date (optional)
  - Comments thread (timestamped, from users and agents)
  - Metadata: creation timestamp, completion timestamp
  - Status indicator: which column the task is in
  - Execution state: idle, in-progress (with progress indicator), completed, error

### Board Columns
Tasks flow through these thematic columns:

1. **The Abyss** - Backlog of tasks waiting in darkness
2. **The Altar** - Tasks prepared and ready for execution
3. **The Ritual** - Active execution (triggers OpenCode/Sprite session)
4. **Cursed** - Blocked tasks with errors
5. **The Trial** - Completed tasks awaiting human review
6. **Vanquished** - Successfully completed and approved tasks

## Task Execution Flow

### The Ritual (Execution Trigger)
When a task is dragged to "The Ritual" column:

1. **Session Initialization**
   - Extract task context: title, description, all comments
   - Read project's AGENTS.md from the repository
   - Create a new feature branch (auto-generated from task title)
   - Spawn Sprite.dev session with full context

2. **During Execution**
   - Task card shows progress indicator
   - User can navigate to Sprite.dev to watch real-time progress
   - Task remains in "The Ritual" column

3. **On Completion**
   - Agent creates pull request with changes
   - Task auto-moves to "The Trial" column
   - Agent adds comment with PR link and summary

4. **On Error**
   - Task auto-moves to "Cursed" column
   - Agent adds comment with error details
   - User can review, provide feedback, and send back to "The Ritual"

### The Trial (Review)
When a task is in "The Trial":

1. User reviews the PR and agent's work
2. User adds feedback via comments on the task card
3. Two paths:
   - **Approve**: Drag to "Vanquished" (task complete)
   - **Request changes**: Drag back to "The Ritual"
     - Spawns new Sprite.dev session
     - Full comment history provides context
     - Agent iterates based on feedback

## Code Standards

Follow all standards from the global AGENTS.md configuration:
- **Strict TypeScript** - no `any`, no type assertions, comprehensive types
- **Effect everywhere** - all async operations, error handling, validation
- **Server Components first** - only use Client Components when necessary
- **Inline Tailwind** - no CSS-in-JS, all styling via Tailwind classes
- **Testing** - comprehensive tests for all features
- **Documentation** - concise JSDoc for public APIs

## UI/UX Guidelines

### Visual Design
- **Dark mode only** with occult aesthetic
- Deep purples, blacks, dark blues
- Cyan/purple accents for interactive elements
- Vercel-style minimalism with mystical touches
- Generous whitespace, refined typography

### Interactions
- Smooth drag-and-drop between columns (150-300ms transitions)
- Hover states on all interactive elements (subtle scale/opacity)
- Progress indicators on cards in "The Ritual"
- Compact card design for mobile-friendly layout
- Responsive design - works on mobile and desktop

### Color Palette
```typescript
// Primary background
bg-black, bg-zinc-950

// Text
text-white/90 (primary)
text-white/60 (secondary)
text-white/40 (tertiary)

// Borders
border-white/10 (subtle)
border-purple-500/20 (mystical accent)

// Accents
purple-500, purple-600 (primary actions)
cyan-400, cyan-500 (secondary actions)
red-500 (errors/cursed)
green-500 (success/vanquished)

// Transitions
transition-all duration-200
```

### Component Guidelines
- Use shadcn/ui for all UI primitives
- Custom styling via Tailwind classes
- Subtle animations on state changes
- Clear loading/disabled states
- Focus indicators for keyboard navigation

## Database Schema

### Core Tables
- `users` - Single-user auth with magic links
- `projects` - Project configuration and metadata
- `tasks` - Task cards with all fields
- `comments` - Comment threads on tasks (polymorphic: user or agent)
- `sprite_sessions` - Track OpenCode/Sprite execution sessions (stubbed for now)

### Relationships
- `projects` → many `tasks`
- `tasks` → many `comments`
- `tasks` → many `sprite_sessions` (execution history)

## Integration Points

### Sprite.dev (Stubbed)
For v1, stub out the Sprite.dev integration with mock responses:
- `spawnSession(task, project)` - returns mock session ID
- `getSessionStatus(sessionId)` - returns mock status (in-progress, completed, error)
- `getSessionLogs(sessionId)` - returns mock logs

Real integration will be added after API research.

### GitHub
- Use GitHub PAT for authentication
- Auto-create feature branches per task
- Create pull requests when tasks complete
- Branch naming: `abraxas/task-{id}-{slugified-title}`

## Agent Behavior

When working on Abraxas:

### Code Quality
- Enforce strict TypeScript rigorously
- Use Effect for all async operations and errors
- Validate Server Components are used by default
- Ensure inline Tailwind usage only
- Write tests for all features

### Task Completion
- Complete requested features fully before suggesting improvements
- Use TodoWrite to plan multi-step features
- Mark todos in_progress when starting
- Complete todos immediately after finishing each step

### Communication
- Be concise and technical
- Explain complex decisions briefly
- Show file:line references for code locations
- No emojis (keep it serious and mystical)

### When to Ask
- Before adding dependencies outside the core stack
- If requirements are ambiguous
- Before making breaking changes

## Testing Strategy

Write tests for:
- Task creation, updates, deletion
- Drag-and-drop state changes
- Comment threads
- Project configuration
- Effect-based error handling paths
- Sprite.dev integration (mock tests for v1)

## MVP Scope

### Must-Have for v1
- Single-user auth with magic links
- Create/manage multiple isolated projects
- Connect project to repo path + GitHub PAT
- Board view with all six mystical columns
- Create task cards with all fields (title, description, optional metadata)
- Drag-and-drop between columns
- Comments on tasks (user and agent)
- Stubbed Sprite.dev integration (mock execution flow)
- Progress indicators on active tasks
- Auto-move tasks based on execution state
- Review flow: feedback via comments, send back to ritual
- Dark mode occult UI
- Mobile-friendly responsive design

### Deferred to v2
- Search/filter tasks
- Archive completed tasks
- Task dependencies
- Real-time board updates (WebSockets)
- Actual Sprite.dev API integration
- Custom column configuration
- Multi-user support
- Keyboard shortcuts
- Export data

## File Structure

```
/app
  /(auth)              # Auth routes (magic link)
  /(dashboard)         # Main app routes
    /projects          # Project list
    /projects/[id]     # Project board view
  /api                 # API routes
/components
  /ui                  # shadcn components
  /board               # Board-specific components
  /tasks               # Task card components
  /projects            # Project components
/lib
  /db                  # Database client
  /effects             # Effect-based services
  /sprite              # Sprite.dev integration (stubbed)
  /github              # GitHub API integration
  /validators          # Validation schemas
/schemas               # Drizzle schemas
/hooks                 # React hooks
/types                 # Shared types
```

## Summary

Abraxas combines mystical aesthetics with practical project management and AI-powered task execution. Follow strict TypeScript and Effect standards while building a minimal, elegant interface that feels like summoning ancient powers to solve modern development challenges.
