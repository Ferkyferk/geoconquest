/**
 * GET /api/leaderboard/daily
 * Returns today's top 50 scores with player info and countries conquered.
 * Public endpoint — no authentication required.
 *
 * Rate-limit recommendation: 60 req / min per IP.
 * Cache recommendation: stale-while-revalidate 60 s (scores update infrequently).
 */

import { prisma } from '@/lib/db'
import { ok, serverError, todayUTC } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic' // never cache at the CDN edge

export async function GET() {
  const date = todayUTC()

  try {
    // Fetch top 50 daily scores with user profile
    const topScores = await prisma.dailyScore.findMany({
      where:   { date },
      orderBy: { score: 'desc' },
      take:    50,
      include: {
        user: { select: { name: true, image: true } },
      },
    })

    if (topScores.length === 0) {
      return ok({ date, scores: [] })
    }

    // Batch-fetch best game sessions for those users so we can return countriesConquered
    const userIds = topScores.map((s) => s.userId)
    const sessions = await prisma.gameSession.findMany({
      where:   { date, userId: { in: userIds } },
      orderBy: { score: 'desc' },
      select:  { userId: true, score: true, countriesConquered: true },
    })

    // Map userId → best session (highest score wins if multiple exist)
    const bestSession = new Map<string, { score: number; countriesConquered: string[] }>()
    for (const s of sessions) {
      const parsed = JSON.parse(s.countriesConquered) as string[]
      const existing = bestSession.get(s.userId)
      if (!existing || s.score > existing.score) {
        bestSession.set(s.userId, { score: s.score, countriesConquered: parsed })
      }
    }

    const scores = topScores.map((s, i) => ({
      rank:               i + 1,
      userId:             s.userId,
      name:               s.user.name ?? 'Anonymous',
      image:              s.user.image,
      score:              s.score,
      countriesConquered: bestSession.get(s.userId)?.countriesConquered ?? [],
    }))

    return ok({ date, scores })
  } catch (err) {
    return serverError(err)
  }
}
