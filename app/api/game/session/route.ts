import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface SaveSessionBody {
  score: number
  countriesConquered: string[]
  continentsConquered: number
  livesRemaining: number
  maxMultiplier: number
  maxStreak: number
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body: SaveSessionBody = await req.json()
  const { score, countriesConquered, continentsConquered, livesRemaining, maxMultiplier, maxStreak } = body

  if (typeof score !== 'number' || !Array.isArray(countriesConquered)) {
    return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 })
  }

  const date = new Date().toISOString().split('T')[0]
  const userId = session.user.id

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
    // Keep the best score for the day
    prisma.dailyScore.upsert({
      where: { userId_date: { userId, date } },
      update: { score: { set: score } }, // overwrite only if higher (handled below)
      create: { userId, date, score },
    }),
  ])

  // If the upserted daily score is lower than today's best, restore it
  await prisma.dailyScore.updateMany({
    where: { userId, date, score: { lt: score } },
    data: { score },
  })

  return Response.json({ success: true, data: { sessionId: gameSession.id } })
}
