/**
 * GET /api/user/stats
 * Returns aggregate statistics for the authenticated user.
 *
 * Rate-limit recommendation: 60 req / min per user.
 */

import { prisma } from '@/lib/db'
import { getAuthUser, ok, unauthorized, serverError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const userId = user.id

  try {
    const [sessions, skillRating, player] = await Promise.all([
      prisma.gameSession.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id:                  true,
          date:                true,
          score:               true,
          countriesConquered:  true,
          continentsConquered: true,
          livesRemaining:      true,
          maxMultiplier:       true,
          maxStreak:           true,
          createdAt:           true,
        },
      }),
      prisma.skillRating.findUnique({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { currentStreak: true, lastPlayedDate: true } }),
    ])

    const totalGames = sessions.length
    const scores     = sessions.map((s) => s.score)
    const bestScore  = totalGames > 0 ? Math.max(...scores) : 0
    const avgScore   = totalGames > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalGames) : 0

    const totalCountriesConquered = sessions.reduce((sum, s) => {
      const list = JSON.parse(s.countriesConquered) as string[]
      return sum + list.length
    }, 0)

    // Compute rank: how many players have a strictly higher rating?
    const currentRating = skillRating?.rating ?? 1000
    const rank = skillRating
      ? await prisma.skillRating.count({ where: { rating: { gt: currentRating } } }) + 1
      : null

    // Recent games (last 10) with parsed country lists
    const recentGames = sessions.slice(0, 10).map((s) => ({
      id:                  s.id,
      date:                s.date,
      score:               s.score,
      countriesConquered:  JSON.parse(s.countriesConquered) as string[],
      continentsConquered: s.continentsConquered,
      livesRemaining:      s.livesRemaining,
      maxMultiplier:       s.maxMultiplier,
      maxStreak:           s.maxStreak,
      playedAt:            s.createdAt,
    }))

    // Compute whether the streak is still active (played today or yesterday)
    const todayStr = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const lastPlayed = player?.lastPlayedDate
    const streakActive = lastPlayed === todayStr || lastPlayed === yesterdayStr
    const dailyStreak = streakActive ? (player?.currentStreak ?? 0) : 0

    return ok({
      totalGames,
      avgScore,
      bestScore,
      totalCountriesConquered,
      dailyStreak,
      skillRating: {
        rating:      Math.round(currentRating),
        gamesPlayed: skillRating?.gamesPlayed ?? 0,
      },
      rank,
      recentGames,
    })
  } catch (err) {
    return serverError(err)
  }
}
