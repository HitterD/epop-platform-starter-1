import argon2 from 'argon2';
import crypto from 'crypto';
import { passwordSchema } from '@/lib/validations/auth';

// Password hashing configuration for Argon2id
const ARGON2_CONFIG = {
  // Argon2id is recommended for passwords (combination of Argon2i and Argon2d)
  type: argon2.argon2id,
  // Memory cost in KiB (64 MB)
  memoryCost: 65536,
  // Number of iterations
  timeCost: 3,
  // Number of parallel threads
  parallelism: 4,
  // Salt length
  saltLength: 32,
  // Hash length
  hashLength: 32,
  // Version (0x13 for Argon2 v1.3)
  version: 0x13,
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // Maximum number of failed attempts
  maxAttempts: 5,
  // Lockout duration in milliseconds (15 minutes)
  lockoutDuration: 15 * 60 * 1000,
  // Track attempts by identifier (email/IP combination)
  trackingWindow: 60 * 60 * 1000, // 1 hour
};

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}>();

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-4
  feedback: string[];
  suggestions: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  lockedUntil?: Date;
  retryAfter?: number; // seconds
}

/**
 * Password Service - Handles secure password hashing, verification, and rate limiting
 */
export class PasswordService {
  /**
   * Hash a password using Argon2id
   */
  static async hashPassword(password: string): Promise<string> {
    // Validate password format before hashing
    const validation = passwordSchema.safeParse(password);
    if (!validation.success) {
      throw new Error(`Invalid password: ${validation.error.errors.map(e => e.message).join(', ')}`);
    }

    try {
      const hash = await argon2.hash(password, ARGON2_CONFIG);
      return hash;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await argon2.verify(hash, password, ARGON2_CONFIG);
      return isValid;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Check if a password needs rehashing (when algorithm parameters change)
   */
  static async needsRehash(hash: string): Promise<boolean> {
    try {
      return await argon2.needsRehash(hash, ARGON2_CONFIG);
    } catch (error) {
      console.error('Error checking rehash:', error);
      return true; // Err on the side of caution
    }
  }

  /**
   * Analyze password strength
   */
  static analyzePasswordStrength(password: string): PasswordStrengthResult {
    const feedback: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score++;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score++;
    else suggestions.push('Consider using 12 or more characters for better security');

    // Character variety checks
    if (/[a-z]/.test(password)) score++;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score++;
    else feedback.push('Include numbers');

    if (/[@$!%*?&]/.test(password)) score++;
    else feedback.push('Include special characters (@$!%*?&)');

    // Common patterns check
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
      /letmein/i,
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      score = Math.max(0, score - 2);
      feedback.push('Avoid common password patterns');
    }

    // Repeated characters check
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid repeated characters');
    }

    // Final suggestions
    if (score < 3) {
      suggestions.push('Consider using a passphrase or password manager');
    }

    const isValid = score >= 3 && password.length >= 8;

    return {
      isValid,
      score: Math.min(4, score),
      feedback,
      suggestions,
    };
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '@$!%*?&';

    const allChars = lowercase + uppercase + numbers + symbols;

    let password = '';

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check rate limiting for password attempts
   */
  static checkRateLimit(identifier: string, ipAddress?: string): RateLimitResult {
    const key = ipAddress ? `${identifier}:${ipAddress}` : identifier;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    // Clean up old records
    for (const [k, v] of rateLimitStore.entries()) {
      if (now - v.firstAttempt > RATE_LIMIT_CONFIG.trackingWindow) {
        rateLimitStore.delete(k);
      }
    }

    if (!record) {
      // First attempt
      rateLimitStore.set(key, {
        attempts: 1,
        firstAttempt: now,
      });

      return {
        allowed: true,
        attemptsRemaining: RATE_LIMIT_CONFIG.maxAttempts - 1,
      };
    }

    // Check if currently locked out
    if (record.lockedUntil && now < record.lockedUntil) {
      return {
        allowed: false,
        attemptsRemaining: 0,
        lockedUntil: new Date(record.lockedUntil),
        retryAfter: Math.ceil((record.lockedUntil - now) / 1000),
      };
    }

    // Check if lockout has expired
    if (record.lockedUntil && now >= record.lockedUntil) {
      // Reset the counter after lockout expires
      rateLimitStore.set(key, {
        attempts: 1,
        firstAttempt: now,
      });

      return {
        allowed: true,
        attemptsRemaining: RATE_LIMIT_CONFIG.maxAttempts - 1,
      };
    }

    // Increment attempt counter
    const newAttempts = record.attempts + 1;
    const attemptsRemaining = Math.max(0, RATE_LIMIT_CONFIG.maxAttempts - newAttempts);

    if (newAttempts >= RATE_LIMIT_CONFIG.maxAttempts) {
      // Lock out
      const lockedUntil = now + RATE_LIMIT_CONFIG.lockoutDuration;
      rateLimitStore.set(key, {
        ...record,
        attempts: newAttempts,
        lockedUntil,
      });

      return {
        allowed: false,
        attemptsRemaining: 0,
        lockedUntil: new Date(lockedUntil),
        retryAfter: Math.ceil(RATE_LIMIT_CONFIG.lockoutDuration / 1000),
      };
    } else {
      // Update attempt count
      rateLimitStore.set(key, {
        ...record,
        attempts: newAttempts,
      });

      return {
        allowed: true,
        attemptsRemaining,
      };
    }
  }

  /**
   * Reset rate limit counter (after successful login)
   */
  static resetRateLimit(identifier: string, ipAddress?: string): void {
    const key = ipAddress ? `${identifier}:${ipAddress}` : identifier;
    rateLimitStore.delete(key);
  }

  /**
   * Generate a secure token for password reset or email verification
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a secure token with expiration
   */
  static generateExpiringToken(expiresInMinutes: number = 60): {
    token: string;
    expiresAt: Date;
  } {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    return { token, expiresAt };
  }

  /**
   * Validate token format
   */
  static isValidTokenFormat(token: string): boolean {
    // Check if token is a hex string of 64 characters (32 bytes)
    return /^[a-f0-9]{64}$/i.test(token);
  }
}

// Export convenience functions
export const hashPassword = PasswordService.hashPassword.bind(PasswordService);
export const verifyPassword = PasswordService.verifyPassword.bind(PasswordService);
export const needsRehash = PasswordService.needsRehash.bind(PasswordService);
export const analyzePasswordStrength = PasswordService.analyzePasswordStrength.bind(PasswordService);
export const generateSecurePassword = PasswordService.generateSecurePassword.bind(PasswordService);
export const checkRateLimit = PasswordService.checkRateLimit.bind(PasswordService);
export const resetRateLimit = PasswordService.resetRateLimit.bind(PasswordService);
export const generateSecureToken = PasswordService.generateSecureToken.bind(PasswordService);
export const generateExpiringToken = PasswordService.generateExpiringToken.bind(PasswordService);