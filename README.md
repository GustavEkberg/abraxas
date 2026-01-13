# Abraxas

A mystical project management interface that summons the power of OpenCode to solve development tasks autonomously.

## Overview

Abraxas is a Trello-like project management tool with AI-powered task execution. Drag tasks to "The Ritual" column to spawn autonomous OpenCode sessions that execute work and create pull requests automatically.

## Features

- **Mystical Board Interface** - Tasks flow through six thematic columns from conception to completion
- **Autonomous Task Execution** - Integration with Sprite.dev to spawn OpenCode sessions
- **AI Feedback Loop** - Comment-based communication between humans and agents
- **GitHub Integration** - Auto-generates feature branches and pull requests
- **Dark Occult Theme** - Sleek, minimal UI with mystical aesthetics

## Tech Stack

- **Next.js 16.1** (App Router) with React 19.2
- **TypeScript 5** (strict mode)
- **Tailwind CSS v4** (dark mode only)
- **PostgreSQL** with Drizzle ORM
- **Effect** for functional programming and error handling
- **pnpm** for package management

## Prerequisites

- Node.js 18+ 
- pnpm 8+
- Docker and Docker Compose (for local database)

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd abraxas
pnpm install
```

### 2. Database Setup

#### Option A: Docker (Recommended)

Start PostgreSQL with Docker Compose:

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on port 5432 with:
- Username: `abraxas`
- Password: `abraxas`
- Database: `abraxas`

To stop the database:

```bash
docker compose down
```

To reset the database (deletes all data):

```bash
docker compose down -v
```

#### Option B: Local PostgreSQL

If you have PostgreSQL installed locally:

```bash
createdb abraxas
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

The default `.env.example` is pre-configured for Docker. Edit `.env.local` and update:

1. **DATABASE_URL** - Use default for Docker, or update if using local PostgreSQL
2. **BETTER_AUTH_SECRET** - Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```
3. **NEXT_PUBLIC_APP_URL** - Keep as `http://localhost:3000` for local development

### 4. Run Database Migrations

Push the schema to your database:

```bash
pnpm db:push
```

Or generate and run migrations:

```bash
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Run migrations
```

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 6. Explore Database (Optional)

Open Drizzle Studio to browse your database:

```bash
pnpm db:studio
```

This opens a GUI at [https://local.drizzle.studio](https://local.drizzle.studio).

## Available Commands

### Development
```bash
pnpm dev          # Start Next.js dev server
pnpm build        # Production build
pnpm start        # Start production server
```

### Database
```bash
pnpm db:generate  # Generate Drizzle migration files
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema changes directly (dev only)
pnpm db:studio    # Open Drizzle Studio (database GUI)
```

### Code Quality
```bash
pnpm lint         # Run ESLint
pnpm lint --fix   # Auto-fix linting issues
npx tsc --noEmit  # Type check without building
```

### Testing (when implemented)
```bash
pnpm test              # Run all tests
pnpm test <filename>   # Run single test file
pnpm test --watch      # Run tests in watch mode
```

## Project Structure

```
/app                  # Next.js App Router pages and layouts
  /(auth)             # Authentication routes
  /(dashboard)        # Main application routes
  /api                # API routes
/components           # React components
  /ui                 # Reusable UI components (shadcn)
  /board              # Board-specific components
  /tasks              # Task card components
/lib                  # Shared library code
  /db                 # Database client and utilities
  /effects            # Effect-based services
  /sprite             # Sprite.dev integration (stubbed)
/schemas              # Drizzle ORM schemas
/hooks                # Custom React hooks
/types                # Shared TypeScript types
/public               # Static assets
```

## Database Schema

### Core Tables

- **users** - User authentication (magic links)
- **projects** - Project configuration and repository connections
- **tasks** - Task cards with status, priority, and execution state
- **comments** - Comment threads (user and agent comments)
- **sprite_sessions** - OpenCode execution session tracking

### Task Flow

Tasks progress through mystical columns:

1. **The Abyss** - Backlog of tasks waiting in darkness
2. **The Altar** - Tasks prepared and ready for execution  
3. **The Ritual** - Active execution (triggers OpenCode session)
4. **Cursed** - Blocked tasks with errors
5. **The Trial** - Completed tasks awaiting human review
6. **Vanquished** - Successfully completed and approved

## Development Guidelines

See [AGENTS.md](./AGENTS.md) for comprehensive development guidelines including:
- Code style standards
- Component architecture patterns
- Effect-based error handling
- TypeScript strict mode enforcement
- Testing requirements

## Environment Variables

Required environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string (default for Docker: `postgres://abraxas:abraxas@localhost:5432/abraxas`)
- `NODE_ENV` - Environment (development, production, test)
- `BETTER_AUTH_SECRET` - Secret key for session encryption (generate with `openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` - Base URL for the application (default: `http://localhost:3000`)

## Authentication

Abraxas uses **Better Auth** with magic link authentication:

- Users sign in by entering their email
- A magic link is sent to their inbox
- Clicking the link authenticates and redirects to the dashboard
- In development, magic links are logged to the console
- Sessions last 7 days and auto-refresh

To configure email sending in production, update the `sendMagicLink` function in `lib/auth.ts` with your email service provider (Resend, SendGrid, etc.).

## Docker Services

The `docker-compose.yml` provides:

- **PostgreSQL 16** on port 5432
- Persistent data volume (`postgres_data`)
- Health checks for connection reliability
- Pre-configured credentials for local development

## Contributing

1. Follow the code standards in [AGENTS.md](./AGENTS.md)
2. Use strict TypeScript (no `any`, no type assertions)
3. Use Effect for all async operations and error handling
4. Default to Server Components, only use Client Components when needed
5. Write tests for all features
6. Run type checking and linting before committing

## License

Private project - all rights reserved.
