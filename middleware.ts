import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // ── Security headers ──────────────────────────────────────────────────────
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  // ── Rate limiting for API routes (simple IP-based, in-memory) ─────────────
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const now = Date.now()
    const windowMs = 60_000 // 1 minute
    const maxRequests = 60  // 60 requests per minute per IP

    const entry = rateLimitMap.get(ip)
    if (entry && now - entry.windowStart < windowMs) {
      entry.count++
      if (entry.count > maxRequests) {
        return Response.json(
          { success: false, error: 'Too many requests' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      }
    } else {
      rateLimitMap.set(ip, { windowStart: now, count: 1 })
    }

    // Clean up stale entries periodically
    if (rateLimitMap.size > 10_000) {
      for (const [key, val] of rateLimitMap) {
        if (now - val.windowStart > windowMs) rateLimitMap.delete(key)
      }
    }
  }

  return response
}

// ── In-memory rate limit store ────────────────────────────────────────────────
// Note: This resets on each cold start in serverless. For persistent rate
// limiting across instances, upgrade to Upstash Redis (@upstash/ratelimit).
const rateLimitMap = new Map<string, { windowStart: number; count: number }>()

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
