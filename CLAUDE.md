# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

GeoConquest is a daily geography conquest game. Players start with a homeland, name neighboring countries to invade, answer trivia to annex them, and expand their territory across a world map.

## Commands

```bash
npm run dev           # Start dev server at http://localhost:3000
npm run build         # Production build (also type-checks)
npm run lint          # ESLint via next lint
npm run start         # Start production server (requires build first)
npx prisma db push    # Push schema changes to database (no migration file)
npx prisma generate   # Regenerate the Prisma client after schema changes
npx prisma migrate dev  # Create and apply a named migration
npx prisma studio     # Open database GUI
```

```bash
npm test              # Run Jest test suite
npm run test:watch    # Jest in watch mode
```

Tests live in `lib/game/__tests__/`. Run a single file: `npm test -- neighbors`.

## Architecture

This is a **Next.js 14 App Router** project. The `app/` directory uses React Server Components by default — add `"use client"` only when browser APIs or interactivity are needed.

### Directory responsibilities

| Path | Purpose |
|---|---|
| `app/` | Pages and layouts (App Router) |
| `app/api/` | API route handlers (`route.ts` files) |
| `components/game/` | Game-specific components: Map, TriviaPanel, ScoreBoard, etc. |
| `components/ui/` | Generic reusable UI: Button, Modal, etc. |
| `lib/game/` | Core game engine — shared between client and server |
| `lib/data/countries.ts` | Country data with neighbor relationships, capitals, coordinates |
| `prisma/` | Prisma schema; PostgreSQL via `DATABASE_URL` env var |

### Key architecture decisions

- All game logic (scoring, multipliers, lives) lives in `lib/game/` and is shared between client and server. Scoring is computed client-side but validated server-side.
- Daily country selection uses a seeded random based on the current date.
- Map rendering uses `react-simple-maps` with Natural Earth TopoJSON data.
- Authentication uses NextAuth with Google and Apple providers.

### Key dependencies

- **next-auth** — Google + Apple OAuth; sessions persist game state and scores
- **prisma + @prisma/client** — PostgreSQL ORM; regenerate client after schema changes
- **react-simple-maps + topojson-client + d3-geo** — world map with geographic projections
- **framer-motion** — UI animations

### Conventions

- TypeScript strict mode — no `any` types
- Named exports only, no default exports
- Tailwind utility classes for all component styling
- Server components by default; `"use client"` only when needed
- All API responses follow `{ success: boolean, data?: T, error?: string }`

### Path alias

`@/` maps to the project root (e.g. `@/lib/game/scoring` → `./lib/game/scoring`).

### Config note

Next.js 14 does not support `next.config.ts`; the config file is `next.config.mjs`.
