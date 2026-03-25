import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ── Auth ─────────────────────────────────────────────────────────────────────

/** Returns the authenticated user object, or null if not signed in. */
export async function getAuthUser() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ? (session.user as { id: string; name?: string | null; email?: string | null; image?: string | null }) : null
}

// ── Response helpers ──────────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status })
}

export function unauthorized(): Response {
  return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
}

export function forbidden(): Response {
  return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
}

export function badRequest(error: string): Response {
  return Response.json({ success: false, error }, { status: 400 })
}

export function notFound(resource = 'Resource'): Response {
  return Response.json({ success: false, error: `${resource} not found` }, { status: 404 })
}

export function conflict(error: string): Response {
  return Response.json({ success: false, error }, { status: 409 })
}

export function serverError(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Internal server error'
  console.error('[API error]', error)
  return Response.json({ success: false, error: message }, { status: 500 })
}

// ── Input validation ──────────────────────────────────────────────────────────

export function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0
}

export function isPositiveFloat(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && v >= 0
}

export function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

/** Returns today's date as a YYYY-MM-DD string (UTC). */
export function todayUTC(): string {
  return new Date().toISOString().split('T')[0]
}
