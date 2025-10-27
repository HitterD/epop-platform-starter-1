import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { resetRateLimit } from './password-service';

// JWT configuration
const JWT_CONFIG = {
  // Access token: short-lived (15 minutes)
  accessTokenExpiry: 15 * 60, // 15 minutes in seconds
  // Refresh token: long-lived (7 days)
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days in seconds
  // Issuer
  issuer: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  // Audience
  audience: 'epop-platform-users',
  // Algorithm
  algorithm: 'HS256' as const,
};

// JWT secrets (from environment variables)
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

// In-memory store for refresh tokens (in production, use Redis or database)
const refreshTokens = new Map<string, {
  userId: string;
  tokenId: string;
  expiresAt: number;
  createdAt: number;
  isRevoked: boolean;
}>();

// In-memory store for blacklisted tokens
const blacklistedTokens = new Set<string>();

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: 'ADMIN' | 'USER';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti?: string; // JWT ID for token identification
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: Date;
  refreshTokenExpiry: Date;
}

export interface RefreshTokenInfo {
  userId: string;
  tokenId: string;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
}

/**
 * JWT Service - Handles secure JWT token generation, validation, and rotation
 */
export class JWTService {
  /**
   * Generate a JWT ID for token identification
   */
  private static generateTokenId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create JWT payload
   */
  private static createPayload(
    user: typeof users.$inferSelect,
    type: 'access' | 'refresh',
    tokenId?: string
  ): Omit<JWTPayload, 'iat' | 'exp'> {
    const now = Math.floor(Date.now() / 1000);

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      iss: JWT_CONFIG.issuer,
      aud: JWT_CONFIG.audience,
      jti: tokenId,
      type,
    };
  }

  /**
   * Generate access token
   */
  static generateAccessToken(user: typeof users.$inferSelect): {
    token: string;
    expiresAt: Date;
  } {
    const tokenId = this.generateTokenId();
    const payload = this.createPayload(user, 'access', tokenId);
    const expiresIn = JWT_CONFIG.accessTokenExpiry;

    const token = jwt.sign(payload, JWT_ACCESS_SECRET, {
      expiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithm: JWT_CONFIG.algorithm,
      jwtid: tokenId,
    });

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return { token, expiresAt };
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(user: typeof users.$inferSelect): {
    token: string;
    expiresAt: Date;
    tokenId: string;
  } {
    const tokenId = this.generateTokenId();
    const payload = this.createPayload(user, 'refresh', tokenId);
    const expiresIn = JWT_CONFIG.refreshTokenExpiry;

    const token = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithm: JWT_CONFIG.algorithm,
      jwtid: tokenId,
    });

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const now = Date.now();

    // Store refresh token info
    refreshTokens.set(tokenId, {
      userId: user.id,
      tokenId,
      expiresAt: expiresAt.getTime(),
      createdAt: now,
      isRevoked: false,
    });

    return { token, expiresAt, tokenId };
  }

  /**
   * Generate token pair (access + refresh)
   */
  static generateTokenPair(user: typeof users.$inferSelect): TokenPair {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      accessTokenExpiry: accessToken.expiresAt,
      refreshTokenExpiry: refreshToken.expiresAt,
    };
  }

  /**
   * Validate access token
   */
  static async validateAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      // Check if token is blacklisted
      const decoded = jwt.decode(token) as any;
      if (decoded?.jti && blacklistedTokens.has(decoded.jti)) {
        return null;
      }

      const payload = jwt.verify(token, JWT_ACCESS_SECRET, {
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        algorithms: [JWT_CONFIG.algorithm],
      }) as JWTPayload;

      // Ensure it's an access token
      if (payload.type !== 'access') {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Access token validation error:', error);
      return null;
    }
  }

  /**
   * Validate refresh token
   */
  static async validateRefreshToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        algorithms: [JWT_CONFIG.algorithm],
      }) as JWTPayload;

      // Ensure it's a refresh token
      if (payload.type !== 'refresh' || !payload.jti) {
        return null;
      }

      // Check if refresh token exists and is not revoked
      const tokenInfo = refreshTokens.get(payload.jti);
      if (!tokenInfo || tokenInfo.isRevoked || tokenInfo.expiresAt < Date.now()) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Refresh token validation error:', error);
      return null;
    }
  }

  /**
   * Refresh tokens (rotate refresh token)
   */
  static async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
    try {
      const payload = await this.validateRefreshToken(refreshToken);
      if (!payload || !payload.jti) {
        return null;
      }

      // Get user from database
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (userResult.length === 0) {
        return null;
      }

      const user = userResult[0];

      // Revoke the old refresh token
      this.revokeRefreshToken(payload.jti);

      // Generate new token pair
      return this.generateTokenPair(user);
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Revoke a refresh token
   */
  static revokeRefreshToken(tokenId: string): void {
    const tokenInfo = refreshTokens.get(tokenId);
    if (tokenInfo) {
      tokenInfo.isRevoked = true;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static revokeAllUserTokens(userId: string): void {
    for (const [tokenId, tokenInfo] of refreshTokens.entries()) {
      if (tokenInfo.userId === userId) {
        tokenInfo.isRevoked = true;
      }
    }
  }

  /**
   * Blacklist a token (for logout)
   */
  static blacklistToken(token: string): void {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded?.jti) {
        blacklistedTokens.add(decoded.jti);
      }
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  /**
   * Clean up expired tokens
   */
  static cleanupExpiredTokens(): void {
    const now = Date.now();

    // Clean up expired refresh tokens
    for (const [tokenId, tokenInfo] of refreshTokens.entries()) {
      if (tokenInfo.expiresAt < now) {
        refreshTokens.delete(tokenId);
      }
    }

    // Note: Blacklisted tokens would also expire naturally when their JWT expires
    // We could implement periodic cleanup here if needed
  }

  /**
   * Get refresh token info
   */
  static getRefreshTokenInfo(tokenId: string): RefreshTokenInfo | null {
    const tokenInfo = refreshTokens.get(tokenId);
    if (!tokenInfo) {
      return null;
    }

    return {
      userId: tokenInfo.userId,
      tokenId: tokenInfo.tokenId,
      expiresAt: new Date(tokenInfo.expiresAt),
      createdAt: new Date(tokenInfo.createdAt),
      isRevoked: tokenInfo.isRevoked,
    };
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7);
  }

  /**
   * Create HTTP-only cookie options for refresh token
   */
  static createRefreshTokenCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
    maxAge: number;
  } {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: JWT_CONFIG.refreshTokenExpiry,
    };
  }

  /**
   * Set refresh token cookie
   */
  static setRefreshTokenCookie(response: Response, refreshToken: string): void {
    const cookieOptions = this.createRefreshTokenCookieOptions();
    const cookieValue = `refresh_token=${refreshToken}; HttpOnly; Secure=${cookieOptions.secure}; SameSite=${cookieOptions.sameSite}; Path=${cookieOptions.path}; Max-Age=${cookieOptions.maxAge}`;

    // Note: In Next.js, you'd typically use NextResponse.json() with cookies
    // This is a utility method for reference
    response.headers.set('Set-Cookie', cookieValue);
  }

  /**
   * Clear refresh token cookie
   */
  static clearRefreshTokenCookie(): string {
    return 'refresh_token=; HttpOnly; Secure=true; SameSite=strict; Path=/; Max-Age=0';
  }
}

// Initialize cleanup interval (run every hour)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    JWTService.cleanupExpiredTokens();
  }, 60 * 60 * 1000); // 1 hour
}

// Export convenience functions
export const generateAccessToken = JWTService.generateAccessToken.bind(JWTService);
export const generateRefreshToken = JWTService.generateRefreshToken.bind(JWTService);
export const generateTokenPair = JWTService.generateTokenPair.bind(JWTService);
export const validateAccessToken = JWTService.validateAccessToken.bind(JWTService);
export const validateRefreshToken = JWTService.validateRefreshToken.bind(JWTService);
export const refreshTokens = JWTService.refreshTokens.bind(JWTService);
export const revokeRefreshToken = JWTService.revokeRefreshToken.bind(JWTService);
export const revokeAllUserTokens = JWTService.revokeAllUserTokens.bind(JWTService);
export const blacklistToken = JWTService.blacklistToken.bind(JWTService);
export const extractTokenFromHeader = JWTService.extractTokenFromHeader.bind(JWTService);