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

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database ([Neon](https://neon.tech) free tier recommended)
- A Google OAuth app (for sign-in)

### 1. Clone and install

```bash
git clone https://github.com/ferkyferk/geoconquest.git
cd geoconquest
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in all required values. See `.env.example` for detailed instructions on each variable.

### 3. Apply the database schema

```bash
npx prisma migrate dev --name init
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## License

All rights reserved.
