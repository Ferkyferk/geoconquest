/**
 * POST /api/friends/request
 * Sends a friend request from the authenticated user to another user.
 *
 * Body: { friendId: string }
 *
 * Rate-limit recommendation: 20 req / user / hour to prevent spam.
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

  const { friendId } = (body ?? {}) as Record<string, unknown>

  if (typeof friendId !== 'string' || !friendId.trim()) {
    return badRequest('friendId is required')
  }
  if (friendId === user.id) {
    return badRequest('You cannot send a friend request to yourself')
  }

  const userId = user.id

  try {
    // Verify the target user exists
    const target = await prisma.user.findUnique({
      where:  { id: friendId },
      select: { id: true, name: true },
    })
    if (!target) return notFound('User')

    // Check for an existing relationship in either direction
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    })

    if (existing) {
      if (existing.status === 'accepted') return conflict('You are already friends')
      return conflict('A friend request already exists between these users')
    }

    const request = await prisma.friendship.create({
      data: { userId, friendId, status: 'pending' },
    })

    return ok({ requestId: request.id, targetName: target.name }, 201)
  } catch (err) {
    return serverError(err)
  }
}
