# GeoConquest

A daily geography conquest game. You start with a randomly assigned homeland, name neighboring countries to invade, answer trivia questions to annex them, and expand your empire across an interactive world map. A new homeland is assigned every day.

---

## Features

- **Daily homeland** — seeded from the current date, same for every player each day
- **Interactive world map** — pan, zoom, and pinch-to-zoom with color-coded territory
- **Trivia invasion** — answer 3 of 5 geography questions to annex a country
- **Scoring & multipliers** — streak bonuses, continent bonuses, world domination bonus
- **ELO skill rating** — persistent rating that improves with every game
- **Leaderboard** — daily scores and all-time skill ratings
- **Google sign-in** — save scores and compete with friends

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Map | react-simple-maps + Natural Earth TopoJSON |
| Auth | NextAuth.js v4 — Google OAuth |
| Database | PostgreSQL via Prisma ORM |
| Deployment | Vercel |

---

## Local Development

### Prerequisites

- Node.js 18+
- A PostgreSQL database (see options below)
- A Google OAuth app (for sign-in)

### 1. Clone and install

```bash
git clone https://github.com/your-username/geoconquest.git
cd geoconquest
npm install
```

### 2. Set up the database

Pick one of the following:

**Option A — Docker (no account needed)**
```bash
docker run --name geoconquest-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=geoconquest \
  -p 5432:5432 -d postgres:16
```
Connection string: `postgresql://postgres:postgres@localhost:5432/geoconquest`

**Option B — Neon (free cloud PostgreSQL, no local install)**
1. Create a free account at [neon.tech](https://neon.tech)
2. Create a project, copy the connection string

**Option C — Homebrew (macOS)**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb geoconquest
```
Connection string: `postgresql://localhost:5432/geoconquest`

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all required values (see [Environment Variables](#environment-variables) below).

### 4. Apply the database schema

```bash
# First time — create migration history and apply schema
npx prisma migrate dev --name init

# Or, skip migration files (simpler, fine for dev):
npm run db:push
```

### 5. (Optional) Seed test data

```bash
npm run db:seed
```

Inserts three test users (Alice, Bob, Carol) with sample game sessions.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` to `.env.local` and set all values. Variables marked **required** must be set before the app will start.

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_URL` | ✅ | Full URL of your deployment (`http://localhost:3000` locally) |
| `NEXTAUTH_SECRET` | ✅ | Random secret for signing sessions. Generate: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | ✅ | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | ✅ | OAuth 2.0 Client Secret from Google Cloud Console |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (see below) |
| `DIRECT_DATABASE_URL` | — | Direct (non-pooled) connection string. Required only when `DATABASE_URL` uses a connection pooler (Neon pooled, Supabase pgBouncer). |

### Setting up Google OAuth

1. Go to [Google Cloud Console → APIs & Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new **OAuth 2.0 Client ID** (Web application)
3. Add **Authorized Redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)
4. Copy the Client ID and Secret into your `.env.local`

### Database URL formats

```bash
# Local Docker / Homebrew
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/geoconquest"

# Neon (append ?sslmode=require)
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/geoconquest?sslmode=require"

# Supabase (use the Transaction pooler URL for serverless)
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
DIRECT_DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.supabase.com:5432/postgres"

# Vercel Postgres (auto-injected, just reference it)
DATABASE_URL=$POSTGRES_URL
```

---

## Deployment to Vercel

### First deploy

1. **Push to GitHub** and connect the repo in the [Vercel dashboard](https://vercel.com/new).

2. **Set environment variables** in Vercel → Project → Settings → Environment Variables:

   | Variable | Value |
   |---|---|
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` |
   | `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` |
   | `GOOGLE_CLIENT_ID` | your Google Client ID |
   | `GOOGLE_CLIENT_SECRET` | your Google Client Secret |
   | `DATABASE_URL` | your production PostgreSQL URL |

3. **Schema is applied automatically** — `vercel.json` runs `prisma db push` as part of every build, so no manual migration step is needed for first deploy.

   When you're ready to use tracked migrations instead (recommended for teams or once you have production data to protect):
   ```bash
   npx prisma migrate dev --name init
   git add prisma/migrations
   git commit -m "Add initial Prisma migration"
   ```
   Then change `vercel.json` `buildCommand` to `prisma migrate deploy && next build`.

4. **Update Google OAuth** — add your production URL to the authorized redirect URIs in Google Cloud Console:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

5. **Deploy** — Vercel triggers a build automatically on push to `main`.

### Subsequent deploys

```bash
git push origin main
```

Schema changes:
```bash
# Edit prisma/schema.prisma, then push — Vercel runs prisma db push on deploy
git push origin main

# If you've switched to tracked migrations:
npx prisma migrate dev --name describe-your-change
git add prisma/migrations
git push
```

### Using Vercel Postgres

1. Vercel Dashboard → your project → Storage → **Create Database → Postgres**
2. Vercel automatically injects `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, etc.
3. Set `DATABASE_URL=$POSTGRES_PRISMA_URL` in your environment variables (the `PRISMA_URL` variant includes connection pooling parameters optimized for serverless).

---

## Scripts Reference

```bash
npm run dev           # Start dev server at http://localhost:3000
npm run build         # Production build (also type-checks)
npm run start         # Serve production build
npm run lint          # ESLint

npm run db:push       # Push schema to database (no migration file — good for dev)
npm run db:migrate    # Create and apply a named migration (dev)
npm run db:deploy     # Apply pending migrations (production)
npm run db:studio     # Open Prisma Studio GUI
npm run db:seed       # Seed database with test users and scores
npm run db:reset      # Reset database and re-apply all migrations

npm test              # Run Jest test suite
npm run test:watch    # Jest in watch mode
```

---

## Project Structure

```
app/
  page.tsx                  # Home / main menu
  game/page.tsx             # Game page
  leaderboard/page.tsx      # Leaderboard (daily + all-time)
  api/
    auth/[...nextauth]/     # NextAuth route handler
    game/save/              # Save game session + update ELO
    leaderboard/daily/      # Top 50 daily scores
    leaderboard/alltime/    # Top 50 skill ratings
    friends/                # Friend requests, accept, list
    user/stats/             # Personal stats

components/
  game/
    WorldMap.tsx            # Interactive TopoJSON map
    TriviaPanel.tsx         # Multiple-choice trivia
    CountryInput.tsx        # Autocomplete country input
    ResultScreen.tsx        # Game-over modal
    AnimatedNumber.tsx      # Count-up number animation
  PageTransition.tsx        # Page enter animation wrapper
  SessionProvider.tsx       # NextAuth session context

lib/
  game/
    engine.ts               # Core game logic (neighbor validation, state)
    scoring.ts              # Score calculation, multipliers, bonuses
    trivia.ts               # Question generation
    elo.ts                  # ELO-style skill rating
  data/countries.ts         # Country data with neighbor graph
  db.ts                     # Prisma singleton
  auth.ts                   # NextAuth configuration
  api-helpers.ts            # Shared API response helpers

prisma/
  schema.prisma             # Database schema
  seed.ts                   # Test data seed script
```
