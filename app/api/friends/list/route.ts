/**
 * GET /api/friends/list
 * Returns the authenticated user's accepted friends, each with their
 * today's best score and overall skill rating.
 *
 * Rate-limit recommendation: 60 req / user / min.
 */

import { prisma } from '@/lib/db'
import { getAuthUser, ok, unauthorized, serverError, todayUTC } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const userId = user.id
  const today  = todayUTC()

  try {
    const friendships = await prisma.friendship.findMany({
      where: { userId, status: 'accepted' },
      include: {
        friend: {
          select: {
            id:    true,
            name:  true,
            image: true,
            dailyScores: {
              where:   { date: today },
              take:    1,
              orderBy: { score: 'desc' },
              select:  { score: true },
            },
            skillRating: {
              select: { rating: true, gamesPlayed: true },
            },
          },
        },
      },
    })

    // Also fetch any pending requests directed at the current user
    const pendingInbound = await prisma.friendship.findMany({
      where: { friendId: userId, status: 'pending' },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })

    type FriendshipWithFriend = typeof friendships[number]
    const friends = friendships.map((f: FriendshipWithFriend) => ({
      userId:       f.friend.id,
      name:         f.friend.name ?? 'Anonymous',
      image:        f.friend.image,
      todayScore:   f.friend.dailyScores[0]?.score ?? null,
      skillRating:  f.friend.skillRating
        ? {
            rating:      Math.round(f.friend.skillRating.rating),
            gamesPlayed: f.friend.skillRating.gamesPlayed,
          }
        : null,
      since:        f.createdAt,
    }))

    // Sort friends: played today first (by score desc), then those who haven't
    friends.sort((a: typeof friends[number], b: typeof friends[number]) => {
      if (a.todayScore !== null && b.todayScore !== null) return b.todayScore - a.todayScore
      if (a.todayScore !== null) return -1
      if (b.todayScore !== null) return  1
      return 0
    })

    type PendingWithUser = typeof pendingInbound[number]
    const pending = pendingInbound.map((p: PendingWithUser) => ({
      requestId:  p.id,
      fromUserId: p.user.id,
      fromName:   p.user.name ?? 'Anonymous',
      fromImage:  p.user.image,
    }))

    return ok({ friends, pendingRequests: pending })
  } catch (err) {
    return serverError(err)
  }
}
