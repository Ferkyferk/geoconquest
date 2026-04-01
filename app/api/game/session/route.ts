import { prisma } from '@/lib/db'
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

interface SaveSessionBody {
  score: number
  countriesConquered: string[]
  continentsConquered: number
  livesRemaining: number
  maxMultiplier: number
  maxStreak: number
}

function validateBody(body: unknown): body is SaveSessionBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    isPositiveInt(b.score) &&
    isStringArray(b.countriesConquered) &&
    isPositiveInt(b.continentsConquered) &&
    isPositiveInt(b.livesRemaining) &&
    isPositiveFloat(b.maxMultiplier) &&
    isPositiveInt(b.maxStreak) &&
    b.countriesConquered.length <= 300 &&
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
  const date = todayUTC()
  const userId = user.id

  try {
    const [gameSession] = await prisma.$transaction([
      prisma.gameSession.create({
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
      }),
      prisma.dailyScore.upsert({
        where: { userId_date: { userId, date } },
        update: { score: { set: score } },
        create: { userId, date, score },
      }),
    ])

    // Keep only the best score for the day
    await prisma.dailyScore.updateMany({
      where: { userId, date, score: { lt: score } },
      data: { score },
    })

    return ok({ sessionId: gameSession.id })
  } catch (err) {
    return serverError(err)
  }
}
