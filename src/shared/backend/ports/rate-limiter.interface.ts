export interface IRateLimiter {
    /**
     * Consume a rate limit slot for the user.
     * @throws Error if rate limit is exceeded
     */
    enforce(userId: string): void;
}
