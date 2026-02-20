import 'server-only';
import { logger } from '../logger';

export type ChatRateLimitConfig = {
    maxRequestsPerMinute: number;
};

/**
 * In-memory rate limiter using sliding window algorithm
 * Tracks requests per user and enforces per-minute limits
 */
export class RateLimiter {
    private readonly requests: Map<string, number[]> = new Map();
    private readonly windowMs = 60_000; // 1 minute in milliseconds
    private readonly limit: number;
    private readonly cleanupInterval: NodeJS.Timeout;

    constructor(config: ChatRateLimitConfig) {
        this.limit = config.maxRequestsPerMinute;
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
     * Consume a rate limit slot for the user.
     * @throws Error if rate limit is exceeded
     */
    enforce(userId: string): void {
        const result = this.consume(userId);
        if (!result.allowed) {
            throw new Error(
                `Rate limit exceeded. Maximum ${this.limit} requests per minute. Retry after ${result.retryAfter} seconds.`,
            );
        }
    }

    /**
     * Check if user can make a request (without consuming)
     */
    check(userId: string): { allowed: boolean; retryAfter?: number } {
        const limit = this.limit;
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

            logger.debug({ userId, requestCount: validTimestamps.length, limit: this.limit }, 'Rate limit consumed');
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
