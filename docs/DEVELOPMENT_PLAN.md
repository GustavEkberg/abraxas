# Abraxas Development Plan

This document outlines the technical architecture, implementation phases, and development roadmap for Abraxas - a mystical project management interface with AI-powered task execution.

## Current Status

**Phase:** Phase 1 Complete ✅ | Phase 2 In Progress 🔄

**Last Updated:** January 14, 2026

### Completed Features
- ✅ Next.js 16.1 project with TypeScript and App Router
- ✅ PostgreSQL 16 database with Docker Compose
- ✅ Drizzle ORM with complete schema (5 tables + Better Auth tables)
- ✅ Effect-based service layer for all database operations
- ✅ Better Auth with magic link authentication
- ✅ Session management (7-day sessions, 1-hour cache)
- ✅ Proxy for route protection (Next.js 16 convention)
- ✅ Automatic logout on auth failures (session invalid, user not in DB)
- ✅ Effect-based user verification in API routes
- ✅ Tailwind CSS v4 with dark occult theme
- ✅ shadcn/ui components installed (button, dialog, input, label, textarea, card)
- ✅ ASCII fire background effect (grayscale, intensity-based)
- ✅ Basic project list page with authentication

### In Progress
- 🔄 Project CRUD API routes
- 🔄 Project creation dialog with form validation
- 🔄 Project list/grid view with cards

### Next Steps
1. Complete project management UI and API
2. Build board view with six mystical columns
3. Implement task creation and drag-and-drop
4. Add comments system
5. Stub Sprite.dev integration

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Core Features & Implementation](#core-features--implementation)
4. [Development Phases](#development-phases)
5. [Technical Considerations](#technical-considerations)
6. [Future Enhancements](#future-enhancements)

---

## Architecture Overview

### Tech Stack Summary

**Frontend:**
- Next.js 16.1 (App Router) ✅
- React 19.2 with Server Components ✅
- TypeScript 5 (strict mode) ✅
- Tailwind CSS v4 (dark mode only) ✅
- shadcn/ui components (Zinc theme) ✅
- @dnd-kit for drag-and-drop ✅ (installed)

**Backend:**
- Next.js API routes ✅
- PostgreSQL 16 database ✅
- Drizzle ORM ✅
- Effect for functional error handling ✅

**Authentication:**
- Better Auth with magic link flow ✅

**External Integrations:**
- Sprite.dev API (stubbed for v1) ⬜
- GitHub API (for branch/PR creation) ⬜

**Deployment:**
- Vercel (primary target) ⬜
- PostgreSQL hosted (Vercel Postgres or similar) ⬜

**Development Environment:**
- Package manager: pnpm ✅
- Docker Compose for PostgreSQL ✅
- Local development on port 3000 ✅

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│  (Next.js App Router + React Server Components)         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Project    │  │     Board    │  │     Task     │ │
│  │     List     │  │     View     │  │    Details   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     API Layer                            │
│           (Next.js API Routes + Effect)                  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Projects   │  │     Tasks    │  │   Comments   │ │
│  │     API      │  │     API      │  │     API      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PostgreSQL  │   │  Sprite.dev  │   │  GitHub API  │
│   Database   │   │  Integration │   │ (Branch/PR)  │
│   (Drizzle)  │   │   (Stubbed)  │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## Database Schema

### Entity-Relationship Diagram

```
┌─────────────┐
│    users    │
│─────────────│
│ id (PK)     │
│ email       │
│ created_at  │
└─────────────┘
      │
      │ 1:N
      ▼
┌─────────────┐
│  projects   │
│─────────────│
│ id (PK)     │
│ user_id (FK)│
│ name        │
│ repo_path   │
│ github_pat  │──── (encrypted)
│ created_at  │
└─────────────┘
      │
      │ 1:N
      ▼
┌─────────────┐         ┌──────────────┐
│    tasks    │ 1:N     │   comments   │
│─────────────│────────▶│──────────────│
│ id (PK)     │         │ id (PK)      │
│ project_id  │         │ task_id (FK) │
│ title       │         │ author_type  │──── (user | agent)
│ description │         │ author_name  │
│ status      │         │ content      │
│ priority    │         │ created_at   │
│ labels      │         └──────────────┘
│ due_date    │
│ created_at  │
│ completed_at│         ┌──────────────────┐
│ branch_name │         │ sprite_sessions  │
│ pr_url      │         │──────────────────│
└─────────────┘         │ id (PK)          │
      │                 │ task_id (FK)     │
      │ 1:N             │ session_id       │
      └────────────────▶│ status           │
                        │ started_at       │
                        │ completed_at     │
                        │ error_message    │
                        └──────────────────┘
```

### Table Definitions

#### `users` (Better Auth `user` table)
```typescript
{
  id: text (primary key) // Better Auth uses text IDs
  email: string (unique, not null)
  emailVerified: boolean
  name: string (nullable)
  image: string (nullable)
  createdAt: timestamp
  updatedAt: timestamp
}
```
Note: Better Auth manages this table. Application uses text IDs for user_id foreign keys.

#### `projects`
```typescript
{
  id: uuid (primary key, defaultRandom())
  user_id: text (foreign key -> user.id) // Better Auth uses text IDs
  name: string (not null)
  repo_path: string (not null) // Local filesystem path
  github_pat: string (encrypted, not null) // Personal access token
  agents_md: text (nullable) // Project-specific AGENTS.md content
  created_at: timestamp (default: now())
  updated_at: timestamp (default: now())
}
```
✅ Implemented in `schemas/projects.ts`

#### `tasks`
```typescript
{
  id: uuid (primary key, defaultRandom())
  project_id: uuid (foreign key -> projects.id, cascade delete)
  title: string (not null)
  description: text (markdown, not null)
  status: task_status enum (not null)
    - 'abyss'      // The Abyss
    - 'altar'      // The Altar
    - 'ritual'     // The Ritual
    - 'cursed'     // Cursed
    - 'trial'      // The Trial
    - 'vanquished' // Vanquished
  execution_state: task_execution_state enum (default: 'idle')
    - 'idle'
    - 'in_progress'
    - 'completed'
    - 'error'
  priority: task_priority enum (nullable)
    - 'high'
    - 'medium'
    - 'low'
  labels: string[] (array, nullable)
  due_date: timestamp (nullable)
  created_at: timestamp (default: now())
  updated_at: timestamp (default: now())
  completed_at: timestamp (nullable)
  branch_name: string (nullable) // Auto-generated feature branch
  pr_url: string (nullable) // GitHub PR URL
}
```
✅ Implemented in `schemas/tasks.ts` with Drizzle enums

#### `comments`
```typescript
{
  id: uuid (primary key, defaultRandom())
  task_id: uuid (foreign key -> tasks.id, cascade delete)
  author_type: comment_author_type enum (not null)
    - 'user'
    - 'agent'
  author_name: string (not null) // Display name
  content: text (markdown, not null)
  created_at: timestamp (default: now())
}
```
✅ Implemented in `schemas/comments.ts` with Drizzle enum

#### `sprite_sessions`
```typescript
{
  id: uuid (primary key, defaultRandom())
  task_id: uuid (foreign key -> tasks.id, cascade delete)
  session_id: string (not null) // Sprite.dev session identifier
  status: sprite_session_status enum (not null)
    - 'in_progress'
    - 'completed'
    - 'error'
  started_at: timestamp (default: now())
  completed_at: timestamp (nullable)
  error_message: text (nullable)
  logs: text (nullable) // Session logs/output
}
```
✅ Implemented in `schemas/sprite-sessions.ts` with Drizzle enum

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_sprite_sessions_task_id ON sprite_sessions(task_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
```

### Effect-Based Services ✅

All database operations use Effect for functional error handling:

**Implemented Services:**
- `lib/effects/users.ts` - User CRUD operations
- `lib/effects/projects.ts` - Project CRUD operations
- `lib/effects/tasks.ts` - Task CRUD operations
- `lib/effects/comments.ts` - Comment CRUD operations
- `lib/effects/sprite-sessions.ts` - Sprite session tracking

**Error Types:**
- `DatabaseQueryError` - Failed database queries
- `RecordNotFoundError` - Missing records
- `DatabaseValidationError` - Constraint violations

**Pattern:**
```typescript
// All operations return Effect with typed errors
export const getProjectById = (id: string): Effect.Effect<Project, DatabaseError> =>
  Effect.gen(function* () {
    const project = yield* Effect.tryPromise({
      try: () => db.query.projects.findFirst({ where: eq(projects.id, id) }),
      catch: (error) => new DatabaseQueryError("Failed to fetch project", error)
    })
    
    if (!project) {
      return yield* Effect.fail(new RecordNotFoundError("Project not found"))
    }
    
    return project
  })
```

---

## Core Features & Implementation

### 1. Authentication (Magic Links) ✅ COMPLETED

**Flow:**
1. User enters email on login page
2. System generates unique magic link token
3. Email sent with magic link (logged to console in dev)
4. User clicks link → validates token → creates session
5. Redirect to projects dashboard
6. On auth failure → automatic logout with cookie clearing

**Implementation:**
- ✅ Better Auth library configured
- ✅ Email provider: Console logging in dev (production: configure Resend/Sendgrid)
- ✅ Session management: HTTP-only cookies
- ✅ Token expiration: 15 minutes
- ✅ Session duration: 7 days
- ✅ Cookie cache: 1 hour (prevents premature timeout)
- ✅ Security: Only sends magic links to existing users
- ✅ Automatic logout on session failure or user deletion
- ✅ Effect-based user verification in `requireAuth` helper
- ✅ Cookie clearing on all auth failures

**Files:**
```
/app/(auth)/login/page.tsx ✅
/app/(auth)/verify/page.tsx ✅
/app/(auth)/layout.tsx ✅
/lib/auth.ts ✅
/lib/auth-client.ts ✅
/lib/api/auth.ts ✅ (Effect-based verification)
/proxy.ts ✅ (Next.js 16 convention)
```

**Database Tables (Better Auth):**
- `user` (text ID)
- `session` (text ID)
- `account` (text ID)
- `verification` (text ID)

**Auth Error Handling:**
- Proxy checks session validity (no DB queries for performance)
- API routes verify user exists in database using Effect
- All failures clear `better-auth.session_token` and `better-auth.session_data` cookies
- 401 responses returned for invalid auth
- Automatic redirect to `/login` on session failure

---

### 2. Project Management

#### Create Project
**UI:** Modal form with fields:
- Project name (required)
- Repository path (required, validated)
- GitHub PAT (required, stored encrypted)

**Validation:**
- Check repo path exists and is a git repository
- Validate PAT has required permissions (repo access)
- Ensure AGENTS.md exists in repo (warn if missing)

**Implementation:**
```typescript
// Effect-based service
const createProject = (data: ProjectInput): Effect.Effect<Project, ProjectError> =>
  Effect.gen(function* () {
    // Validate repo path
    const repoValid = yield* validateRepoPath(data.repoPath)
    
    // Validate GitHub PAT
    const patValid = yield* validateGitHubPAT(data.githubPat)
    
    // Encrypt PAT
    const encryptedPAT = yield* encryptPAT(data.githubPat)
    
    // Insert into database
    const project = yield* db.insert(projects).values({
      name: data.name,
      repoPath: data.repoPath,
      githubPat: encryptedPAT,
      userId: data.userId
    })
    
    return project
  })
```

#### List Projects
**UI:** Grid/list of project cards
- Project name
- Last activity timestamp
- Task count by status
- Click to open board

---

### 3. Board View (Kanban)

#### Column Layout
Six columns displayed horizontally:
1. The Abyss
2. The Altar
3. The Ritual
4. Cursed
5. The Trial
6. Vanquished

**Visual Design:**
- Each column: dark background, subtle border
- Column headers: mystical styling, task count badge
- Scrollable card lists within columns
- Horizontal scroll on mobile if needed

#### Drag-and-Drop Implementation

**Library:** `@dnd-kit/core`

**Features:**
- Drag tasks between any columns
- Smooth animations (150-300ms)
- Optimistic UI updates
- Server sync on drop

**Special behavior:**
- Drop on "The Ritual" → triggers Sprite session
- Drop on "Cursed" → no special action (manual placement)
- Drop on "Vanquished" → sets completed_at timestamp

**Implementation:**
```typescript
const handleDragEnd = (event: DragEndEvent) =>
  Effect.gen(function* () {
    const { active, over } = event
    
    if (!over) return
    
    const taskId = active.id
    const newStatus = over.id as TaskStatus
    
    // Optimistic update
    updateTaskStatusOptimistic(taskId, newStatus)
    
    // Special handling for "The Ritual"
    if (newStatus === 'ritual') {
      yield* spawnSpriteSession(taskId)
    }
    
    // Server update
    yield* updateTaskStatus(taskId, newStatus)
  })
```

---

### 4. Task Management

#### Create Task
**UI:** Modal form or inline card creation

**Fields:**
- Title (required)
- Description (markdown editor, required)
- Priority (optional dropdown)
- Labels (optional tags input)
- Due date (optional date picker)

**Default status:** `abyss` (The Abyss)

#### Task Card (Compact View)
**Display:**
- Title (truncated if long)
- Priority indicator (color badge)
- Labels (small tags)
- Due date (if set, with urgency color)
- Progress indicator (if in "The Ritual")
- Comment count badge

**Interactions:**
- Click to open detail modal
- Drag to move between columns

#### Task Detail Modal
**Sections:**
1. **Header:** Title, status badge, close button
2. **Metadata:** Priority, labels, due date (editable)
3. **Description:** Markdown content (editable)
4. **Comments:** Threaded conversation
   - User comments: left-aligned, purple accent
   - Agent comments: right-aligned, cyan accent
   - Timestamp on each comment
5. **Actions:** Delete task, copy link

---

### 5. Comments System

**Features:**
- Add comments to any task
- Markdown support
- User vs agent attribution
- Chronological order
- Timestamps

**Implementation:**
```typescript
const addComment = (data: CommentInput): Effect.Effect<Comment, CommentError> =>
  Effect.gen(function* () {
    const comment = yield* db.insert(comments).values({
      taskId: data.taskId,
      authorType: 'user',
      authorName: data.userName,
      content: data.content
    })
    
    return comment
  })
```

**Agent comments:**
- Added automatically when Sprite session completes
- Include PR link, summary, or error details

---

### 6. Sprite.dev Integration (Stubbed)

#### Mock Implementation for v1

**Service interface:**
```typescript
interface SpriteService {
  spawnSession: (task: Task, project: Project) => Effect.Effect<string, SpriteError>
  getSessionStatus: (sessionId: string) => Effect.Effect<SessionStatus, SpriteError>
  getSessionLogs: (sessionId: string) => Effect.Effect<string[], SpriteError>
}
```

**Mock behavior:**
```typescript
const mockSpriteService: SpriteService = {
  spawnSession: (task, project) =>
    Effect.succeed(`mock-session-${task.id}`).pipe(
      Effect.delay(1000) // Simulate API call
    ),
  
  getSessionStatus: (sessionId) =>
    Effect.succeed({
      status: 'in_progress',
      progress: 0.5
    }).pipe(
      Effect.delay(500)
    ),
  
  getSessionLogs: (sessionId) =>
    Effect.succeed([
      'Analyzing task context...',
      'Creating feature branch...',
      'Implementing changes...'
    ])
}
```

**Mock execution flow:**
1. User drags task to "The Ritual"
2. System calls `spawnSession` (returns mock session ID)
3. Task shows progress indicator (50% complete)
4. After 30 seconds, mock completes:
   - Status → `completed`
   - Auto-move task to "The Trial"
   - Add mock agent comment with fake PR link
   - Set `branch_name` and `pr_url` on task

**Error simulation:**
- 10% chance of mock error
- Move task to "Cursed"
- Add error comment

#### Real Integration (v2)

**Research needed:**
- Sprite.dev API documentation
- Authentication method
- Webhook support for status updates
- How to pass AGENTS.md context
- Rate limits and costs

---

### 7. GitHub Integration

**Features:**
1. Create feature branches
2. Create pull requests (via agent/Sprite)
3. Link PRs to tasks

**Branch naming convention:**
```
abraxas/task-{uuid}-{slugified-title}
```

**Implementation:**
```typescript
const createFeatureBranch = (task: Task, project: Project): Effect.Effect<string, GitHubError> =>
  Effect.gen(function* () {
    const octokit = yield* getOctokitClient(project.githubPat)
    const branchName = `abraxas/task-${task.id}-${slugify(task.title)}`
    
    // Get default branch SHA
    const { data: ref } = yield* Effect.tryPromise({
      try: () => octokit.rest.git.getRef({
        owner: project.owner,
        repo: project.repo,
        ref: 'heads/main'
      }),
      catch: (error) => new GitHubError('Failed to get ref', error)
    })
    
    // Create new branch
    yield* Effect.tryPromise({
      try: () => octokit.rest.git.createRef({
        owner: project.owner,
        repo: project.repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha
      }),
      catch: (error) => new GitHubError('Failed to create branch', error)
    })
    
    return branchName
  })
```

---

## Development Phases

### Phase 1: Foundation (Week 1) ✅ COMPLETED

**Goals:** Project setup, authentication, basic UI

**Tasks:**
1. ✅ Initialize Next.js project with TypeScript
2. ✅ Configure Tailwind CSS v4 + shadcn/ui
3. ✅ Set up PostgreSQL + Drizzle ORM
4. ✅ Create database schema and migrations
5. ✅ Implement Better Auth with magic links
6. ✅ Build basic layout (header, navigation)
7. ✅ Create project list page (empty state)
8. ✅ Add ASCII fire background effect

**Deliverables:**
- ✅ Working authentication flow
- ✅ Database schema deployed
- ✅ Basic UI shell
- ✅ Mystical ASCII fire background

**Implementation Notes:**
- Next.js 16.1 with App Router and React 19.2
- Tailwind CSS v4 with inline @theme configuration
- PostgreSQL 16 running via Docker Compose
- Drizzle ORM with Effect-based service layer
- Better Auth with magic link authentication (email logged to console in dev)
- Session duration: 7 days with 1-hour cookie cache
- shadcn/ui components installed: button, dialog, input, label, textarea, card
- @dnd-kit installed for future drag-and-drop implementation
- ASCII fire component with dynamic intensity (default: 8, max: 35 for active rituals)
- Dark occult theme with grayscale fire effect at bottom of screen

---

### Phase 2: Project Management (Week 2) 🔄 IN PROGRESS

**Goals:** Create/manage projects

**Tasks:**
1. ⏳ Project creation form with validation
2. ⏳ Project list/grid view
3. ⬜ Project settings page
4. ⬜ Encrypt/decrypt GitHub PAT utilities
5. ⬜ Validate repository path and PAT
6. ✅ Effect-based project service layer
7. ⬜ Tests for project CRUD operations

**Deliverables:**
- ⏳ Full project management functionality
- ⏳ Projects persisted to database
- ⬜ Validated GitHub integration setup

**Current Status:**
- Effect-based service layer completed (`lib/effects/projects.ts`)
- Database schema ready with UUID primary keys
- Next: Build project creation dialog and API routes

---

### Phase 3: Board View & Tasks (Week 3)

**Goals:** Kanban board with drag-and-drop

**Tasks:**
1. Board layout with six columns
2. Task card component (compact view)
3. Task creation modal
4. Task detail modal
5. Implement @dnd-kit drag-and-drop
6. Task CRUD operations (Effect-based)
7. Status transitions on drag
8. Tests for task operations

**Deliverables:**
- Functional kanban board
- Task management working
- Drag-and-drop between columns

---

### Phase 4: Comments & Feedback (Week 4)

**Goals:** Comment threads, user-agent communication

**Tasks:**
1. Comment component (user vs agent styling)
2. Add comment form
3. Display comments in task detail
4. Comment CRUD operations
5. Auto-add agent comments (mock)
6. Tests for comment system

**Deliverables:**
- Working comment threads
- Visual distinction between user/agent comments
- Feedback loop ready for Sprite integration

---

### Phase 5: Sprite Integration (Mock) (Week 5)

**Goals:** Simulate OpenCode execution flow

**Tasks:**
1. Stub Sprite service interface
2. Mock session spawning
3. Progress indicators on cards in "The Ritual"
4. Mock session completion (30s delay)
5. Auto-move tasks on completion/error
6. Generate mock PR URLs
7. Store sprite_sessions records
8. Tests for execution flow

**Deliverables:**
- Full task execution flow (mocked)
- Progress indicators working
- Auto-status transitions
- Mock agent comments with PR links

---

### Phase 6: GitHub Integration (Week 6)

**Goals:** Real branch/PR creation

**Tasks:**
1. Octokit setup with PAT
2. Create feature branch function
3. Parse repo owner/name from path
4. Link branches to tasks
5. Display PR links in task cards
6. Tests for GitHub operations

**Deliverables:**
- Real feature branches created
- PR creation stubbed (agent does this)
- GitHub integration tested

---

### Phase 7: Polish & Testing (Week 7)

**Goals:** Refine UI, comprehensive tests, docs

**Tasks:**
1. Refine occult theme styling
2. Add subtle animations and transitions
3. Loading states and error handling UI
4. Comprehensive E2E tests
5. Performance optimization
6. Mobile responsiveness verification
7. Update documentation

**Deliverables:**
- Production-ready UI
- Full test coverage
- Deployment ready

---

### Phase 8: Deployment (Week 8)

**Goals:** Launch to Vercel

**Tasks:**
1. Set up Vercel project
2. Configure PostgreSQL (Vercel Postgres)
3. Environment variables configuration
4. Deploy staging environment
5. Test end-to-end on staging
6. Deploy production
7. Monitor and fix issues

**Deliverables:**
- Live production deployment
- Monitoring set up
- MVP complete

---

## Technical Considerations

### Security

**GitHub PAT Storage:**
- Encrypt PATs before storing in database
- Use AES-256 encryption
- Store encryption key in environment variable
- Never expose PAT in client-side code

**Authentication:**
- HTTP-only cookies for session
- CSRF protection enabled
- Magic link tokens expire after 15 minutes
- Rate limit magic link requests

**API Routes:**
- Validate user authentication on all routes
- Check project ownership before operations
- Sanitize user input (SQL injection prevention)
- Rate limit API endpoints

### Performance

**Database Optimization:**
- Indexes on foreign keys and status fields
- Paginate task lists if >100 tasks per project
- Cache project metadata
- Use database connection pooling

**UI Optimization:**
- Server Components for initial load
- Client Components only where needed (drag-and-drop)
- Lazy load task detail modal
- Optimize images and assets
- Use React.memo for task cards

**Drag-and-Drop:**
- Optimistic UI updates (instant feedback)
- Debounce server updates (300ms)
- Cancel in-flight requests on new drag

### Error Handling

**Effect-based patterns:**
```typescript
// Define error types
class DatabaseError {
  readonly _tag = "DatabaseError"
  constructor(readonly message: string, readonly cause?: unknown) {}
}

class ValidationError {
  readonly _tag = "ValidationError"
  constructor(readonly message: string, readonly field: string) {}
}

class GitHubError {
  readonly _tag = "GitHubError"
  constructor(readonly message: string, readonly cause?: unknown) {}
}

// Use in operations
const createTask = (data: TaskInput): Effect.Effect<Task, DatabaseError | ValidationError> =>
  Effect.gen(function* () {
    // Validate
    const validated = yield* Schema.decode(TaskSchema)(data)
    
    // Insert
    const task = yield* Effect.tryPromise({
      try: () => db.insert(tasks).values(validated),
      catch: (error) => new DatabaseError("Failed to create task", error)
    })
    
    return task
  })
```

**UI Error Display:**
- Toast notifications for transient errors
- Error boundaries for fatal errors
- Inline validation errors on forms
- Retry buttons for failed operations

### Testing Strategy

**Unit Tests:**
- Effect-based services (pure logic)
- Validation schemas
- Utility functions
- Mock external dependencies

**Integration Tests:**
- API routes with test database
- Database operations
- GitHub API interactions (mocked)

**E2E Tests:**
- Full user flows (Playwright)
- Authentication flow
- Project creation
- Task creation and drag-and-drop
- Comment threads
- Mock Sprite execution

**Test Coverage Goals:**
- 80%+ coverage for services
- 100% coverage for critical paths (auth, task execution)

---

## Future Enhancements (v2+)

### Real Sprite.dev Integration
- Research Sprite.dev API
- Implement authentication
- Real-time status updates (webhooks or polling)
- Stream OpenCode logs to UI
- Resume sessions on page refresh

### Advanced Features
- Search and filter tasks (by status, priority, labels)
- Archive completed tasks
- Task dependencies (block/unblock)
- Keyboard shortcuts (j/k navigation, hotkeys)
- Custom column configuration per project
- Export data (JSON, CSV)
- Dark/light theme toggle (currently dark only)
- Multi-user support (team collaboration)
- Real-time board updates (WebSockets)
- Task templates
- Bulk operations (move multiple tasks)
- Activity log (audit trail)

### UI Improvements
- List and calendar views
- Card size toggle (compact/detailed)
- Column collapsing
- Board zoom levels
- Customizable card colors
- Emoji support in titles

### Integration Enhancements
- GitLab support (in addition to GitHub)
- Webhook integrations (Discord, Slack notifications)
- Linear/Jira import
- Git commit linking

### Performance
- Virtual scrolling for large task lists
- Background sync with service workers
- Offline mode support

---

## Summary

Abraxas v1 focuses on building a minimal, functional project management interface with a mystical aesthetic and stubbed AI task execution. The architecture prioritizes:

- **Type safety** with strict TypeScript
- **Functional error handling** with Effect
- **Server-first** rendering with Next.js
- **Clean UI** with dark mode occult theme
- **Extensibility** for future Sprite.dev integration

Development spans 8 weeks across 8 phases, delivering a production-ready MVP deployed to Vercel with PostgreSQL persistence.

The stubbed Sprite integration allows full UI/UX development while research continues on the real Sprite.dev API. Once API details are confirmed, the mock service can be swapped with minimal refactoring.

**Next Steps:**
1. Initialize Next.js project (Phase 1)
2. Set up database schema
3. Implement authentication
4. Begin UI development

Let the ritual begin. 🔮
