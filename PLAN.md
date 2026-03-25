# GeoConquest — Implementation Plan

## Phase 1: Core Game Engine

### Country Data
- [x] Create `lib/data/countries.ts` with 150+ countries including name, ISO code, neighbors, capital, continent, population, languages, currency, and lat/lng coordinates
- [x] Export typed `Country` interface and lookup maps (by ISO code and by name)

### Neighbor Validation
- [x] `lib/game/engine.ts` — given a set of occupied ISO codes, return all valid invasion targets (countries that border at least one occupied country)
- [x] Handle edge cases: island nations with no land borders, territories, disputed regions

### Trivia Generator
- [x] `lib/game/trivia.ts` — generate a 4-choice trivia question for a given country
- [x] Question types: capital city, continent, population range, official language, currency, number of land borders
- [x] Wrong answers chosen from plausible alternatives (same continent, similar population, etc.)

### Scoring Engine
- [x] `lib/game/scoring.ts` — pure functions for all score calculations
- [x] Annexation: 100 pts × multiplier
- [x] Trivia bonus: 50 pts × multiplier per correct answer
- [x] Streak multiplier: increases by 0.5× per consecutive success
- [x] Continent bonus: 1,000 pts when all countries in a continent are annexed
- [x] World domination bonus: 25,000 pts
- [x] Multiplier resets to 1× on wrong guess or failed invasion

### Lives System
- [x] `lib/game/scoring.ts` — track 3 lives, decrement on wrong guess or failed trivia, game over at 0 (`applyFailure`, `isGameOver`)
- [x] Lives loss resets the streak multiplier

### Daily Seed
- [x] `lib/game/engine.ts` (`getDailyCountry`) — deterministic seeded random using today's UTC date (YYYY-MM-DD) as seed
- [x] Select homeland country-of-the-day consistently for all players

---

## Phase 2: Game UI

### World Map
- [ ] `components/game/Map.tsx` — interactive SVG world map via `react-simple-maps`
- [ ] Load Natural Earth TopoJSON data into `public/`
- [ ] Color territories: occupied (gold), valid invasion targets (highlighted), neutral (dark)
- [ ] Click-to-select country on map as an alternative to text input

### Country Input
- [ ] `components/game/CountryInput.tsx` — text input with autocomplete
- [ ] Autocomplete list filtered to valid invasion targets only
- [ ] Keyboard navigation (arrow keys + enter)

### Trivia Panel
- [ ] `components/game/TriviaPanel.tsx` — 4-choice question card
- [ ] Progress bar showing time remaining (or question number in session)
- [ ] Correct/wrong answer animations via framer-motion
- [ ] Show flag and country name during trivia

### HUD
- [ ] `components/game/HUD.tsx` — header bar showing score, lives, multiplier, streak counter
- [ ] Animated score increment on point gain

### Game Flow & Pages
- [ ] `app/page.tsx` — landing/menu page with Play Today's Game CTA
- [ ] `app/game/page.tsx` — main game page, client component orchestrating game state
- [ ] `app/game/result/page.tsx` — end-of-game summary (score, countries conquered, stats)
- [ ] Game state machine: `idle → selecting → trivia → result → game-over`

### Theme
- [ ] Dark cartographic color scheme with gold accents in `app/globals.css`
- [ ] Custom Tailwind theme tokens for game colors in `tailwind.config.ts`

---

## Phase 3: Database & Auth

### Prisma Schema
- [ ] `User` — id, email, name, image, provider, createdAt
- [ ] `GameSession` — id, userId, date, score, countriesConquered, livesRemaining, completed, createdAt
- [ ] `DailyScore` — id, userId, date, score, rank (denormalized for leaderboard queries)
- [ ] `Friendship` — id, requesterId, addresseeId, status (pending/accepted)
- [ ] Run `npx prisma migrate dev` and generate client

### NextAuth
- [ ] `app/api/auth/[...nextauth]/route.ts` — configure Google and Apple providers
- [ ] Persist user to database on first sign-in via Prisma adapter
- [ ] `lib/auth.ts` — export shared `authOptions` for use in server components and API routes

### API Routes
- [ ] `POST /api/game/save` — save completed game session, write DailyScore row
- [ ] `GET /api/stats/[userId]` — return user's score history and aggregate stats
- [ ] `GET /api/leaderboard/daily` — top scores for today's date

### User Profile Page
- [ ] `app/profile/page.tsx` — server component showing score history chart and lifetime stats
- [ ] Protected route; redirect to sign-in if unauthenticated

---

## Phase 4: Leaderboard & Social

### Daily Leaderboard
- [ ] `app/leaderboard/page.tsx` — today's top scores, refreshed on load
- [ ] Show rank, avatar, name, score, countries conquered

### Skill Ranking
- [ ] Rolling 30-day average score as skill rating (or ELO-style if competitive mode added later)
- [ ] `GET /api/leaderboard/alltime` — ranked by skill rating

### Friends System
- [ ] `POST /api/friends/request` — send friend request
- [ ] `POST /api/friends/respond` — accept or reject
- [ ] `GET /api/friends` — list accepted friends with their latest daily score
- [ ] Friends tab on leaderboard page showing only friend scores

### Score Cards
- [ ] `app/api/og/route.tsx` — Next.js OG image generation for score share cards
- [ ] Show country count, score, date, and a miniature map of conquered territory
- [ ] Share button on result page (copies link / opens native share sheet on mobile)

---

## Phase 5: Polish & Deploy

### Animations & Transitions
- [ ] Page transitions with framer-motion `AnimatePresence`
- [ ] Map territory reveal animation when a country is annexed
- [ ] Multiplier pop animation in HUD on streak increase
- [ ] Shake animation on wrong answer / life loss

### Mobile Responsiveness
- [ ] Map scales and pans correctly on small screens
- [ ] Trivia panel and HUD stack vertically on mobile
- [ ] Touch-friendly country selection (tap map or scrollable autocomplete list)

### Error Handling & Loading States
- [ ] `app/error.tsx` and `app/not-found.tsx` global handlers
- [ ] Skeleton loaders for map and leaderboard
- [ ] Optimistic UI for score saves with error rollback

### Deployment
- [ ] Configure `vercel.json` and environment variables (DATABASE_URL, NEXTAUTH_SECRET, OAuth credentials)
- [ ] Deploy to Vercel
- [ ] Provision production PostgreSQL (PlanetScale or Supabase)
- [ ] Run `prisma migrate deploy` against production database
- [ ] Smoke test daily seed, auth flow, and score save end-to-end
