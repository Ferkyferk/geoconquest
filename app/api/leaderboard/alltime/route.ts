/**
 * GET /api/leaderboard/alltime
 * Returns the top 50 players ranked by skill rating.
 * Public endpoint — no authentication required.
 *
 * Rate-limit recommendation: 60 req / min per IP.
 * Cache recommendation: stale-while-revalidate 300 s (ratings update slowly).
 */

import { prisma } from '@/lib/db'
import { ok, serverError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const topRatings = await prisma.skillRating.findMany({
      where:   { gamesPlayed: { gte: 1 } }, // exclude users who have never played
      orderBy: { rating: 'desc' },
      take:    50,
      include: {
        user: { select: { name: true, image: true } },
      },
    })

    const ratings = topRatings.map((r, i) => ({
      rank:        i + 1,
      userId:      r.userId,
      name:        r.user.name ?? 'Anonymous',
      image:       r.user.image,
      rating:      Math.round(r.rating),
      gamesPlayed: r.gamesPlayed,
    }))

    return ok({ ratings })
  } catch (err) {
    return serverError(err)
  }
}
