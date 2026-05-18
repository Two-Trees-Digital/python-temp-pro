# App — Marketing Site / Main Application

> **Next.js 14** | App Router | Contentlayer MDX | Tailwind CSS | Radix UI

The main customer-facing marketing website and application frontend. Built with Next.js 14 App Router, featuring a comprehensive blog powered by Contentlayer, marketing pages, and authentication-ready architecture.

---

## Quick Start

```bash
# Development
pnpm dev --filter app

# Build and run
pnpm build --filter app
pnpm start --filter app

# Linting
pnpm lint --filter app
```

The app runs on port 3000 in development mode.

---

## Architecture

### Next.js 14 & App Router

This application uses Next.js 14 with the App Router for file-based routing. All page routes are located in `src/app/` with modern `page.tsx` and `layout.tsx` structure.

**Key routing patterns:**
- Dynamic routes: `[slug]`, `[id]`
- Route groups: `(auth)`, `(marketing)`
- API routes: `src/app/api/*`
- Nested layouts for shared structure

### Content Management

**Contentlayer** provides MDX-based content management for blog posts. The `content/` directory contains markdown/MDX files:

```
content/
  blog/
    my-first-post.mdx
    another-post.mdx
    ... (more blog posts)
```

Contentlayer compiles these to a type-safe content layer at build time. Blog posts are accessible via `/blog` route and `/blog/[slug]` for individual posts.

### Authentication

NextAuth.js handles user authentication with JWT-based sessions:

- Email/password authentication
- OAuth providers (configurable)
- JWT-based session management
- Protected routes via middleware

Protected routes use the middleware pattern defined in `src/middleware.ts`.

---

## Project Structure

```
apps/app/
├── public/                    # Static assets (images, fonts, etc.)
├── src/
│   ├── app/                   # App Router pages and layouts
│   │   ├── (marketing)/       # Public marketing routes
│   │   ├── (auth)/            # Authentication routes
│   │   ├── api/               # API endpoints
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/            # Reusable React components
│   │   ├── About.tsx
│   │   ├── Blog.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Pricing.tsx
│   │   ├── Services.tsx
│   │   ├── Team.tsx
│   │   ├── Contact.tsx
│   │   └── ... (other components)
│   ├── middleware.ts          # Next.js middleware
│   └── styles/                # Global and modular styles
├── content/                   # Contentlayer MDX blog posts
├── next.config.js             # Next.js configuration
├── contentlayer.config.ts      # Contentlayer configuration
└── tsconfig.json              # TypeScript configuration
```

---

## Key Features

### Components

| Component | Description |
|-----------|-------------|
| **HomePage** | Landing page with hero section |
| **About** | Company background and values |
| **Blog** | Dynamic blog with Contentlayer-powered MDX |
| **Portfolio** | Showcase of client work and case studies |
| **Pricing** | Service tier pricing and plans |
| **Services** | Detailed service offerings |
| **Team** | Team member profiles |
| **Contact** | Contact form with validation |
| **FAQ** | Frequently asked questions accordion |

### Styling

- **Tailwind CSS** for utility-first styling and responsive design
- **Sass/SCSS** for complex stylesheets
- **CSS modules** for component-scoped styles

### Animations

- **Framer Motion** — Advanced animations and transitions
- **AOS (Animate On Scroll)** — Scroll-triggered animations for marketing pages

### UI Components

**Radix UI** provides unstyled, accessible component primitives:
- Accordion for collapsible content
- Dialog/Modal for overlays
- Dropdown menus
- Form components with validation
- And other accessible foundations

---

## Dependencies

### Core
- next@14.1.0 - React framework
- react@18 - UI library
- react-dom@18 - DOM rendering

### Content & MDX
- contentlayer@0.x - MDX content layer
- next-contentlayer@0.x - Next.js integration
- @mdx-js/react@2.x - MDX runtime

### Authentication
- next-auth@4.x - Authentication middleware
- jose@4.x - JWT token operations
- @next-auth/prisma-adapter - Database adapter

### UI & Components
- @radix-ui/* - Accessible component primitives
- tailwindcss@3.x - Utility CSS framework
- sass - SCSS support
- framer-motion - Advanced animations
- aos - Scroll animations

### Utilities
- slugify - URL-friendly string generation
- zod - Schema validation
- sharp - Image optimization

### Form & Validation
- react-hook-form - Performant form handling
- @hookform/resolvers - Zod resolver for forms

---

## Database Integration

This app depends on the `database` workspace package (Prisma ORM) for data access.

```typescript
// Example: accessing Prisma from the app
import { PrismaClient } from 'database';

const db = new PrismaClient();
const users = await db.user.findMany();
```

**Available models:**
- User - User accounts and profiles
- Role - RBAC roles
- Todo - User to-do items

---

## Routes

### Public Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/about` | About page |
| `/blog` | Blog listing |
| `/blog/[slug]` | Individual blog post |
| `/portfolio` | Portfolio showcase |
| `/pricing` | Pricing page |
| `/services` | Services page |
| `/team` | Team page |
| `/contact-us` | Contact form page |
| `/faq` | FAQ page |

### API Routes

| Route | Description |
|-------|-------------|
| `/api/auth/*` | NextAuth endpoints |
| `/api/contact` | Contact form submission |
| `/api/subscribe` | Newsletter signup |

---

## Environment Variables

Create a `.env.local` file:

```env
# Next.js public app URL
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here

# Database
DATABASE_URL=postgresql://user:password@host:5432/db

# Public URLs (exposed to browser)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Note: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## Build Process

```bash
pnpm build
```

The build process:
1. Compiles Next.js with TypeScript
2. Generates Contentlayer content types
3. Optimizes images with sharp
4. Creates static/SSR bundles
5. Runs postbuild script: `next-sitemap` for SEO

---

## Production Deployment

This app is deployed to Vercel automatically on pushes to the `main` branch via GitHub Actions.

**Required Vercel environment variables:**
- `DATABASE_URL` - Production database connection
- `NEXTAUTH_SECRET` - JWT signing secret (strong random string)
- `NEXTAUTH_URL` - Production URL (https://yourdomain.com)

The GitHub Actions workflow handles:
1. Database migrations
2. Prisma client generation
3. Next.js build
4. Vercel deployment

---

## Development Workflows

### Adding a Blog Post

1. Create a new `.mdx` file in `content/blog/`:
   ```bash
   content/blog/my-new-post.mdx
   ```

2. Add frontmatter with metadata:
   ```mdx
   ---
   title: "My Post Title"
   date: "2026-04-13"
   author: "Author Name"
   excerpt: "Short summary of the post"
   image: "/images/post-image.jpg"
   ---

   Your markdown content here...
   ```

3. The blog will automatically pick up and render the post
4. Access at `/blog/my-new-post` (slug auto-generated from filename)

### Adding a New Page

1. Create a folder in `src/app/(marketing)/my-page/`
2. Add `page.tsx`:
   ```typescript
   export default function MyPage() {
     return (
       <div>
         <h1>My New Page</h1>
         {/* Page content */}
       </div>
     );
   }
   ```
3. Automatically accessible at `/my-page`

### Protected Pages (Authenticated)

Wrap pages that require authentication:

```typescript
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect("/login");
  }

  return <div>Protected content — only logged-in users see this</div>;
}
```

---

## Middleware

Defined in `src/middleware.ts`, the middleware:
- Handles authenticated route protection
- Manages session validation
- Redirects unauthenticated users from protected routes
- Can enforce specific auth requirements per route

---

## Performance Optimization

- **Image optimization**: Next.js Image component automatically optimizes images
- **Code splitting**: App Router enables automatic code splitting per route
- **CSS purging**: Tailwind CSS is purged during build for minimal bundle size
- **Caching**: Contentlayer caches compiled content between builds
- **Font optimization**: Next.js font optimization for custom fonts

---

## Troubleshooting

### Build fails with "Contentlayer error"
- Run `pnpm contentlayer build` to check for schema issues
- Ensure all MDX files have valid frontmatter
- Check for missing required fields in blog post frontmatter

### Authentication issues
- Check `NEXTAUTH_SECRET` is set in `.env.local`
- Verify `NEXTAUTH_URL` matches your current environment
- Clear `.next` cache and rebuild: `rm -rf .next && pnpm build`
- Check browser cookies are not blocked

### Database connection errors
- Verify `DATABASE_URL` is correct and database is running
- Check network connectivity to database host
- For Neon PostgreSQL, verify the pooled connection is used (not direct)

### Port 3000 already in use
- Find what's using it: `lsof -i :3000`
- Kill the process: `kill -9 [PID]`
- Or change the port in dev script

---

## Testing

To add tests:

```bash
pnpm add -D jest @testing-library/react
```

Test files should go in `src/__tests__/` or alongside components as `.test.tsx` files.

Example test:
```typescript
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('renders the homepage', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
```

---

## Related Documentation

- **Next.js 14 Documentation** — https://nextjs.org/docs
- **Contentlayer Documentation** — https://contentlayer.dev
- **NextAuth.js Documentation** — https://next-auth.js.org
- **Tailwind CSS Documentation** — https://tailwindcss.com
- **Radix UI Documentation** — https://www.radix-ui.com
- **Prisma Documentation** — https://www.prisma.io/docs
