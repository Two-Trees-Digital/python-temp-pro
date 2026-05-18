# Dashboard — Admin Interface

> **Next.js 14** | App Router | NextAuth | Tailwind CSS | Prisma

A lightweight Next.js 14 admin dashboard providing authentication and basic management interface. This is a starting point for building your application's administrative features.

---

## Quick Start

```bash
# Development (runs on port 3001)
pnpm dev --filter dashboard

# Build and run
pnpm build --filter dashboard
pnpm start --filter dashboard

# Linting
pnpm lint --filter dashboard
```

The dashboard runs on port 3001 in development mode.

---

## Architecture

### Next.js 14 App Router

Dashboard uses Next.js 14 App Router with server-side rendering for efficient data fetching. All routes are in `src/app/` directory.

**Key features:**
- Server components for database queries
- API routes for backend logic
- Middleware for auth protection
- Next.js dynamic imports for code splitting

### Authentication & Session Management

NextAuth.js wired through the shared `packages/auth` factory (TT-118):

- Credentials provider (email + password) — always on
- Google OAuth — gated on `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
- GitHub OAuth — gated on `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`
- JWT-based sessions (30-day duration)
- Forgot-password / reset-password flow via email tokens (Resend in prod, console fallback in dev)
- `signIn` callback auto-links OAuth identities to existing email-verified accounts; blocks if the existing account hasn't verified email yet

**Middleware** (`src/middleware.ts`) enforces auth + role on every page route
(API routes are deliberately excluded — per-route helpers handle those).
The decision tree: `/login` is public; everything else requires a JWT and
`role.name === "ADMIN"` (otherwise it bounces to the marketing site).

**Session provider** wraps the app at the root layout.

### Database Integration

Prisma provides type-safe database access:

```typescript
import { PrismaClient } from "database";

const prisma = new PrismaClient();
const users = await prisma.user.findMany();
```

---

## Project Structure

```
apps/dashboard/
├── public/                    # Static assets
├── src/
│   ├── app/                   # App Router pages and layouts
│   │   ├── api/               # API routes
│   │   ├── layout.tsx         # Root layout with auth provider
│   │   ├── page.tsx           # Dashboard home
│   │   └── providers.tsx       # Next.js providers wrapper
│   ├── components/            # Reusable UI components
│   │   ├── Dashboard.tsx       # Main dashboard component
│   │   ├── Header.tsx          # Header/navbar
│   │   ├── Sidebar.tsx         # Sidebar navigation
│   │   └── ... (other UI components)
│   ├── lib/                    # Utility functions
│   │   ├── auth.ts             # NextAuth configuration
│   │   ├── db.ts               # Prisma client singleton
│   │   └── api-client.ts       # Server-side API calls
│   ├── hooks/                  # Custom React hooks
│   └── middleware.ts           # Route protection
├── next.config.js              # Next.js configuration
└── tsconfig.json               # TypeScript configuration
```

---

## Key Features

### Authentication

- Local development auth for easy testing
- NextAuth with Credentials provider
- Session-based access control
- Protected routes and API endpoints

### Database Integration

Access Prisma client from any server component or API route:

```typescript
import { PrismaClient } from "database";

const prisma = new PrismaClient();
const user = await prisma.user.findUnique({
  where: { id: "user-123" },
});
```

### API Routes

Create API endpoints in `src/app/api/`:

```typescript
// apps/dashboard/src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "database";

export async function GET(request: NextRequest) {
  const prisma = new PrismaClient();
  const items = await prisma.todo.findMany();
  
  return NextResponse.json(items);
}
```

### Server Components

Fetch data directly in components:

```typescript
import { PrismaClient } from "database";

export default async function DashboardHome() {
  const prisma = new PrismaClient();
  const userCount = await prisma.user.count();
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total users: {userCount}</p>
    </div>
  );
}
```

---

## Environment Variables

The full reference lives in [`/.env.example`](../../.env.example). Most
vars (database, Resend, OAuth providers) belong in the root `.env`
because they're shared with `apps/app`. The dashboard typically only
needs a `.env.local` for the local-dev `NEXTAUTH_URL`:

```env
# apps/dashboard/.env.local
NEXTAUTH_URL=http://localhost:3001
```

**Generate `NEXTAUTH_SECRET`** (set in root `.env`):
```bash
openssl rand -base64 32
```

OAuth and email are optional — sign-in pages gate the buttons on
env-var presence, and the email package falls back to console-logging
in dev when `RESEND_API_KEY` is unset.

---

## Build Configuration

The dashboard has special build handling due to Prisma:

```bash
pnpm build --filter dashboard
```

Build steps:
1. Compile shared packages (queue, email) with TypeScript
2. Run Prisma migration: `prisma migrate deploy`
3. Generate Prisma client: `prisma generate`
4. Build Next.js: `next build`

**Cache Configuration:**
- Dashboard build has `cache: false` in `turbo.json`
- **Never enable caching** — Prisma engine binaries are platform-specific
- Prevents failures when caching builds across different OS (macOS → Linux)

---

## Port Configuration

Dashboard explicitly uses port 3001:

**Development:**
```bash
pnpm dev --filter dashboard
```

**Production:**
```bash
pnpm start
```

Override in `.env.local` if needed:
```env
PORT=3001
```

---

## Adding Pages

### Creating a New Page

1. Create folder in `src/app/new-page/`
2. Add `page.tsx`:

```typescript
import { PrismaClient } from "database";

export default async function NewPage() {
  const prisma = new PrismaClient();
  const data = await prisma.todo.findMany();
  
  return (
    <div>
      <h1>New Page</h1>
      <ul>
        {data.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Protected Pages

Require authentication:

```typescript
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect("/login");
  }

  return <div>Only authenticated users see this</div>;
}
```

---

## API Routes

Create API endpoints in `src/app/api/`:

```typescript
// apps/dashboard/src/app/api/todos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "database";

export async function GET(request: NextRequest) {
  // Protect the route
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = new PrismaClient();
  const todos = await prisma.todo.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const prisma = new PrismaClient();
  
  const todo = await prisma.todo.create({
    data: {
      title: body.title,
      description: body.description,
      userId: session.user.id,
      isCompleted: false,
    },
  });

  return NextResponse.json(todo);
}
```

---

## Middleware

Protect routes with middleware (`src/middleware.ts`):

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Protect routes starting with /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

---

## Deployment

This app is deployed to Vercel automatically on pushes to `main` branch.

**GitHub Actions workflow:** `.github/workflows/deploy-vercel.yml`

**Required GitHub Secrets:**
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_DASHBOARD_PROJECT_ID` - Vercel project ID

**Required Vercel Environment Variables:**
- `DATABASE_URL` — Production database connection (pooled)
- `DIRECT_URL` — Direct database connection for migrations
- `NEXTAUTH_SECRET` — JWT signing secret (strong random string)
- `NEXTAUTH_URL` — Production URL (https://yourdomain.com)
- `NEXT_PUBLIC_APP_URL` — Public origin of the marketing app (used to build password-reset links back to the apps/app `/reset-password` page)

**Optional:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — real password-reset email sends
- `NEXTAUTH_COOKIE_DOMAIN` — set to `.example.com` for cross-subdomain SSO

---

## Common Tasks

### Adding a Database Query

```typescript
// In a server component
import { PrismaClient } from "database";

const prisma = new PrismaClient();
const user = await prisma.user.findUnique({
  where: { email: "user@example.com" },
  include: { todos: true }, // Include relations
});
```

### Creating a Form

```typescript
"use client";

import { useState } from "react";

export default function TodoForm() {
  const [title, setTitle] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: "" }),
    });

    const data = await response.json();
    console.log("Created:", data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button type="submit">Create Todo</button>
    </form>
  );
}
```

### Working with Sessions

Access the current user:

```typescript
import { getServerSession } from "next-auth/next";

export default async function MyPage() {
  const session = await getServerSession();
  
  return <div>Welcome, {session?.user?.email}!</div>;
}
```

---

## Troubleshooting

### Dashboard won't start on port 3001
- Check if port is already in use: `lsof -i :3001`
- Kill existing process: `kill -9 <PID>`
- Try different port: `next dev --port 3002`

### Authentication not working
- Verify `NEXTAUTH_SECRET` is set (non-empty, random string)
- Check `NEXTAUTH_URL` matches current environment
- Clear cookies: DevTools > Application tab > Cookies > delete all
- Rebuild: `rm -rf .next && pnpm build`

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check network connectivity to database
- Ensure database service is running
- For PostgreSQL, check credentials and port

### API routes returning 500 errors
- Check logs in terminal for error messages
- Verify `DATABASE_URL` and `DIRECT_URL` are set
- Ensure Prisma is generated: `pnpm db:generate`
- Check NextAuth configuration

### Build fails with Prisma errors
- Delete `.next` directory: `rm -rf .next`
- Regenerate Prisma: `pnpm db:generate`
- Run migrations: `pnpm db:deploy`
- Clear node_modules: `rm -rf node_modules && pnpm install`

---

## Performance Optimization

- **Server components**: Fetch data server-side, not in useEffect
- **Image optimization**: Use Next.js Image component
- **Code splitting**: App Router automatically splits code per route
- **CSS purging**: Tailwind CSS is purged during build

---

## Testing

To add tests:

```bash
pnpm add -D jest @testing-library/react
```

Test files should go in `src/__tests__/` or alongside components as `.test.tsx`.

---

## Related Documentation

- **Next.js 14 Documentation** — https://nextjs.org/docs
- **NextAuth.js Documentation** — https://next-auth.js.org
- **Prisma Documentation** — https://www.prisma.io/docs
- **Tailwind CSS Documentation** — https://tailwindcss.com
