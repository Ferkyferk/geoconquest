/**
 * POST /api/game/save
 * Saves a completed game session, updates the daily leaderboard entry, and
 * recalculates the player's skill rating using the ELO formula.
 *
 * Rate-limit recommendation: 20 req / user / day (one per game).
 * Implement with Upstash Ratelimit or Vercel KV in production.
 */

import { prisma } from '@/lib/db'
import { updateRating } from '@/lib/game/elo'
import {
  getAuthUser,
  ok,
  unauthorized,
  badRequest,
  serverError,
  isPositiveInt,
  isPositiveFloat,
  isStringArray,
  todayUTC,
} from '@/lib/api-helpers'

interface SaveGameBody {
  score: number
  countriesConquered: string[]
  continentsConquered: number
  livesRemaining: number
  maxMultiplier: number
  maxStreak: number
}

function validateBody(body: unknown): body is SaveGameBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    isPositiveInt(b.score) &&
    isStringArray(b.countriesConquered) &&
    isPositiveInt(b.continentsConquered) &&
    isPositiveInt(b.livesRemaining) &&
    isPositiveFloat(b.maxMultiplier) &&
    isPositiveInt(b.maxStreak) &&
    b.countriesConquered.length <= 300 &&   // sanity cap: ~195 real countries
    (b.livesRemaining as number) <= 10 &&
    (b.maxMultiplier as number) <= 50
  )
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Request body must be valid JSON')
  }

  if (!validateBody(body)) {
    return badRequest('Invalid payload — check score, countriesConquered, continentsConquered, livesRemaining, maxMultiplier, maxStreak')
  }

  const { score, countriesConquered, continentsConquered, livesRemaining, maxMultiplier, maxStreak } = body
  const userId = user.id
  const date   = todayUTC()

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1 ── Persist the game session
      const gameSession = await tx.gameSession.create({
        data: {
          userId,
          date,
          score,
          countriesConquered: JSON.stringify(countriesConquered),
          continentsConquered,
          livesRemaining,
          maxMultiplier,
          maxStreak,
        },
      })

      // 2 ── Update daily best score (keep the higher of new vs existing)
      const existingDaily = await tx.dailyScore.findUnique({
        where: { userId_date: { userId, date } },
      })
      if (!existingDaily || score > existingDaily.score) {
        await tx.dailyScore.upsert({
          where:  { userId_date: { userId, date } },
          update: { score },
          create: { userId, date, score },
        })
      }

      // 3 ── Recalculate skill rating (ELO-like)
      const existing = await tx.skillRating.findUnique({ where: { userId } })
      const currentRating  = existing?.rating      ?? 1000
      const prevGamesPlayed = existing?.gamesPlayed ?? 0
      const newRating = updateRating(currentRating, prevGamesPlayed, score)

      const skillRating = await tx.skillRating.upsert({
        where:  { userId },
        update: { rating: newRating, gamesPlayed: { increment: 1 } },
        create: { userId, rating: newRating, gamesPlayed: 1 },
      })

      return { gameSession, skillRating, prevRating: currentRating }
    })

    return ok({
      sessionId:    result.gameSession.id,
      newRating:    result.skillRating.rating,
      ratingDelta:  result.skillRating.rating - result.prevRating,
      gamesPlayed:  result.skillRating.gamesPlayed,
    })
  } catch (err) {
    return serverError(err)
  }
}
