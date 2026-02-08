import 'server-only';
import { getServerConfig } from '../../config/env';
import { logger } from '../logger';

/**
 * In-memory rate limiter using sliding window algorithm
 * Tracks requests per user and enforces per-minute limits
 */
class RateLimiter {
    private readonly requests: Map<string, number[]> = new Map();
    private readonly windowMs = 60_000; // 1 minute in milliseconds
    private readonly cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Cleanup expired entries every minute to prevent memory leaks
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.windowMs);

        // Ensure cleanup runs even if process is terminated
        if (typeof process !== 'undefined') {
            process.on('beforeExit', () => {
                clearInterval(this.cleanupInterval);
            });
        }
    }

    /**
     * Check if user can make a request (without consuming)
     */
    check(userId: string): { allowed: boolean; retryAfter?: number } {
        const config = getServerConfig();
        const limit = config.chat.maxRequestsPerMinute;
        const now = Date.now();
        const windowStart = now - this.windowMs;

        const timestamps = this.requests.get(userId) || [];
        const validTimestamps = timestamps.filter((ts) => ts > windowStart);

        const allowed = validTimestamps.length < limit;

        if (!allowed && validTimestamps.length > 0) {
            // Calculate when the oldest request will expire
            const oldestTimestamp = validTimestamps[0];
            const retryAfter = Math.ceil((oldestTimestamp + this.windowMs - now) / 1000);
            return { allowed: false, retryAfter };
        }

        return { allowed };
    }

    /**
     * Record a request and check if it's allowed
     */
    consume(userId: string): { allowed: boolean; retryAfter?: number } {
        const result = this.check(userId);

        if (result.allowed) {
            const now = Date.now();
            const windowStart = now - this.windowMs;
            const timestamps = this.requests.get(userId) || [];
            const validTimestamps = timestamps.filter((ts) => ts > windowStart);

            validTimestamps.push(now);
            this.requests.set(userId, validTimestamps);

            logger.debug(
                { userId, requestCount: validTimestamps.length, limit: getServerConfig().chat.maxRequestsPerMinute },
                'Rate limit consumed',
            );
        } else {
            logger.warn({ userId, retryAfter: result.retryAfter }, 'Rate limit exceeded');
        }

        return result;
    }

    /**
     * Clean up expired entries to prevent memory leaks
     */
    private cleanup(): void {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        let cleaned = 0;

        for (const [userId, timestamps] of this.requests.entries()) {
            const validTimestamps = timestamps.filter((ts) => ts > windowStart);

            if (validTimestamps.length === 0) {
                this.requests.delete(userId);
                cleaned++;
            } else if (validTimestamps.length < timestamps.length) {
                this.requests.set(userId, validTimestamps);
            }
        }

        if (cleaned > 0) {
            logger.debug({ cleaned, remaining: this.requests.size }, 'Rate limiter cleanup completed');
        }
    }

    /**
     * Get current request count for a user
     */
    getCount(userId: string): number {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        const timestamps = this.requests.get(userId) || [];
        return timestamps.filter((ts) => ts > windowStart).length;
    }

    /**
     * Reset rate limit for a user (for testing or admin purposes)
     */
    reset(userId: string): void {
        this.requests.delete(userId);
        logger.debug({ userId }, 'Rate limit reset');
    }
}

// Singleton instance
let limiterInstance: RateLimiter | null = null;

function getRateLimiter(): RateLimiter {
    if (!limiterInstance) {
        limiterInstance = new RateLimiter();
    }
    return limiterInstance;
}

/**
 * Check if user can make a request without consuming
 */
export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
    return getRateLimiter().check(userId);
}

/**
 * Consume a rate limit slot for the user
 * @throws Error if rate limit is exceeded
 */
export function enforceRateLimit(userId: string): void {
    const result = getRateLimiter().consume(userId);

    if (!result.allowed) {
        const config = getServerConfig();
        throw new Error(
            `Rate limit exceeded. Maximum ${config.chat.maxRequestsPerMinute} requests per minute. Retry after ${result.retryAfter} seconds.`,
        );
    }
}

/**
 * Get current request count for a user
 */
export function getRateLimitCount(userId: string): number {
    return getRateLimiter().getCount(userId);
}

/**
 * Reset rate limit for a user
 */
export function resetRateLimit(userId: string): void {
    getRateLimiter().reset(userId);
}
