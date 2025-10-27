import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from './password-service';

/**
 * Rate limiting middleware for authentication endpoints
 */
export function createRateLimitMiddleware(
  identifierExtractor: (req: NextRequest) => string,
  options: {
    maxRequests?: number;
    windowMs?: number;
    message?: string;
  } = {}
) {
  const {
    maxRequests = 5,
    windowMs = 15 * 60 * 1000, // 15 minutes
    message = 'Too many requests. Please try again later.',
  } = options;

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const identifier = identifierExtractor(req);
    const ipAddress = req.ip ||
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const result = checkRateLimit(identifier, ipAddress);

    if (!result.allowed) {
      const headers = new Headers();

      if (result.retryAfter) {
        headers.set('Retry-After', result.retryAfter.toString());
        headers.set('X-RateLimit-Remaining', '0');
        headers.set('X-RateLimit-Reset', new Date(Date.now() + result.retryAfter * 1000).toISOString());
      } else {
        headers.set('X-RateLimit-Remaining', result.attemptsRemaining.toString());
      }

      headers.set('X-RateLimit-Limit', maxRequests.toString());

      return NextResponse.json(
        {
          error: message,
          retryAfter: result.retryAfter,
          lockedUntil: result.lockedUntil,
        },
        {
          status: 429,
          headers
        }
      );
    }

    // Add rate limit headers to successful responses
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', maxRequests.toString());
    headers.set('X-RateLimit-Remaining', result.attemptsRemaining.toString());

    // Return null to allow the request to proceed
    // The calling code should merge these headers into the response
    return null;
  };
}

/**
 * Rate limit middleware for login attempts
 */
export const loginRateLimit = createRateLimitMiddleware(
  (req) => {
    // Try to extract email from request body for more specific rate limiting
    const url = req.url;
    if (url.includes('/login')) {
      // For POST requests, we'll handle rate limiting in the route handler
      // since we need to parse the body
      return 'login';
    }
    return 'unknown';
  },
  {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    message: 'Too many login attempts. Please try again later.',
  }
);

/**
 * Rate limit middleware for password reset requests
 */
export const passwordResetRateLimit = createRateLimitMiddleware(
  () => 'password-reset',
  {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many password reset attempts. Please try again later.',
  }
);

/**
 * Rate limit middleware for registration attempts
 */
export const registrationRateLimit = createRateLimitMiddleware(
  () => 'registration',
  {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many registration attempts. Please try again later.',
  }
);

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  limit: number,
  reset?: Date
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());

  if (reset) {
    response.headers.set('X-RateLimit-Reset', reset.toISOString());
  }

  return response;
}