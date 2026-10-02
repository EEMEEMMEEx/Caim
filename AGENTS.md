<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CAIM — Equipment Claims & RMA Management System

## What This Is
Production web portal for Forth Corporation's Telecommunication Equipment Claims & Overseas RMA Tracking System. Built on Next.js 16 App Router, Tailwind CSS v4, shadcn/ui, MongoDB, and local JSON persistence.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **UI:** shadcn/ui (Radix primitives, Tailwind CSS v4, `cn()` utility)
- **Icons:** Lucide React (scalable SVGs, no emojis as icons)
- **Styling:** Tailwind CSS v4 with dark theme glassmorphism design tokens
- **Database:** MongoDB with dual-layer persistent disk store fallback
- **Real-Time:** Server-Sent Events (SSE) via `/api/realtime/stream`

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript check
- `npm run check` — Run lint + typecheck + build

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utility classes, no inline styles
- 2-space indentation
- Responsive: mobile-first

## Project Structure
```
src/
  app/              # Next.js routes & API handlers (/api/claims, /api/tickets, /api/rma, etc.)
  components/       # React components (Dashboard, Tickets, Stations, Overseas RMA, etc.)
    claims/         # Claims modular components (ClaimStakeholdersSection)
    ui/             # shadcn/ui primitives
  lib/
    constants/      # System constants & HTTP headers
    events/         # Real-time event emitter
    storage/        # Persistent server storage & disk stores
    utils/          # Duration, SLA, and date calculations
    validations/    # Zod schemas (claimSchema)
  types/            # Database documents & interfaces (database.ts)
  hooks/            # Custom SWR & query hooks
public/
  assets/           # Active media assets & posters
  videos/           # Portal background video
  seo/              # Favicons and web manifests
scripts/            # Database migration, seed, and data generation utilities
```
