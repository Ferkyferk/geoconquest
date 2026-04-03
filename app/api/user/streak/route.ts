/**
 * GET /api/user/streak
 * Returns the authenticated user's current daily play streak.
 */

import { prisma } from '@/lib/db'
import { getAuthUser, ok, unauthorized, serverError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const player = await prisma.user.findUnique({
      where: { id: user.id },
      select: { currentStreak: true, lastPlayedDate: true },
    })

    const todayStr = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const lastPlayed = player?.lastPlayedDate
    const streakActive = lastPlayed === todayStr || lastPlayed === yesterdayStr
    const dailyStreak = streakActive ? (player?.currentStreak ?? 0) : 0

    return ok({ dailyStreak })
  } catch (err) {
    return serverError(err)
  }
}
