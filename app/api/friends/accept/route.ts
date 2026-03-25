/**
 * POST /api/friends/accept
 * Accepts a pending friend request sent to the authenticated user.
 * Creates the reverse friendship record so both users see each other.
 *
 * Body: { requesterId: string }  — the user who sent the original request
 *
 * Rate-limit recommendation: 60 req / user / hour.
 */

import { prisma } from '@/lib/db'
import {
  getAuthUser,
  ok,
  unauthorized,
  badRequest,
  notFound,
  conflict,
  serverError,
} from '@/lib/api-helpers'

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Request body must be valid JSON')
  }

  const { requesterId } = (body ?? {}) as Record<string, unknown>

  if (typeof requesterId !== 'string' || !requesterId.trim()) {
    return badRequest('requesterId is required')
  }

  const userId = user.id // the user accepting the request

  try {
    // Find the original pending request (requester → current user)
    const pending = await prisma.friendship.findFirst({
      where: { userId: requesterId, friendId: userId, status: 'pending' },
    })

    if (!pending) {
      return notFound('Pending friend request')
    }

    // Guard: reverse record shouldn't exist yet, but check to avoid duplicates
    const alreadyAccepted = await prisma.friendship.findFirst({
      where: { userId, friendId: requesterId },
    })
    if (alreadyAccepted) {
      return conflict('Friendship already exists')
    }

    // Accept in a transaction: update the original + create the reverse
    await prisma.$transaction([
      prisma.friendship.update({
        where: { id: pending.id },
        data:  { status: 'accepted' },
      }),
      prisma.friendship.create({
        data: { userId, friendId: requesterId, status: 'accepted' },
      }),
    ])

    return ok({ accepted: true, withUserId: requesterId })
  } catch (err) {
    return serverError(err)
  }
}
