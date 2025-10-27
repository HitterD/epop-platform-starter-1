import { NextRequest, NextResponse } from 'next/server';
import { validateAccessToken, extractTokenFromHeader, JWTPayload } from './jwt-service';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Authentication middleware to validate JWT tokens
 */
export async function withAuth(
  request: NextRequest,
  options: {
    required?: boolean;
    roles?: ('ADMIN' | 'USER')[];
  } = {}
): Promise<{ response?: NextResponse; user?: JWTPayload }> {
  const { required = true, roles = [] } = options;

  // Extract token from Authorization header
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  // If no token and authentication is required
  if (!token && required) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    };
  }

  // If no token and authentication is optional
  if (!token && !required) {
    return {};
  }

  // Validate token
  const user = await validateAccessToken(token!);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    };
  }

  // Check role requirements
  if (roles.length > 0 && !roles.includes(user.role)) {
    return {
      response: NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    };
  }

  return { user };
}

/**
 * Admin-only middleware
 */
export async function withAdmin(request: NextRequest): Promise<{ response?: NextResponse; user?: JWTPayload }> {
  return withAuth(request, { required: true, roles: ['ADMIN'] });
}

/**
 * Create API route handler with authentication
 */
export function createAuthenticatedHandler<T extends any[]>(
  handler: (request: NextRequest, context: { user: JWTPayload }, ...args: T) => Promise<NextResponse>,
  options: {
    required?: boolean;
    roles?: ('ADMIN' | 'USER')[];
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await withAuth(request, options);

    // If authentication failed, return the error response
    if (authResult.response) {
      return authResult.response;
    }

    // If authentication is optional and no user found, call handler without user
    if (!options.required && !authResult.user) {
      return handler(request, {} as { user: JWTPayload }, ...args);
    }

    // Call handler with authenticated user
    return handler(request, { user: authResult.user! }, ...args);
  };
}

/**
 * Get current user from request (for client-side usage)
 */
export function getCurrentUser(request: NextRequest): JWTPayload | null {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  // This is a synchronous validation for client-side usage
  // For server-side, always use validateAccessToken
  try {
    const jwt = require('jsonwebtoken');
    const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';

    const payload = jwt.verify(token, JWT_ACCESS_SECRET, {
      issuer: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      audience: 'epop-platform-users',
      algorithms: ['HS256'],
    });

    if (payload.type !== 'access') {
      return null;
    }

    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Add CORS headers for API responses
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

/**
 * Handle OPTIONS requests for CORS
 */
export function handleOptions(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(response);
  }

  return null;
}