export interface ITokenTracker {
    /**
     * Check quota before operation and throw if exceeded.
     * @throws Error if quota is exceeded
     */
    enforceQuota(userId: string): Promise<void>;

    /**
     * Track token usage for a user.
     */
    trackUsage(userId: string, tokenCount: number): Promise<void>;

    /**
     * Update conversation total tokens.
     */
    updateConversationTokens(conversationId: string, tokenCount: number): Promise<void>;
}
