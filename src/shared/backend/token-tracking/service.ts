import 'server-only';
import { prisma } from 'src/shared/backend/prisma';
import { getServerConfig } from 'src/shared/config/env';
import { logger } from 'src/shared/backend/logger';

export type TokenUsageResult = {
    used: number;
    limit: number;
    remaining: number;
    resetAt: Date;
};

export type QuotaCheckResult = {
    allowed: boolean;
    usage: TokenUsageResult;
};

/**
 * Get today's date at midnight UTC for daily token tracking
 */
function getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Get tomorrow's date at midnight UTC (reset time)
 */
function getTomorrowUTC(): Date {
    const today = getTodayUTC();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow;
}

/**
 * Get current token usage for a user today
 */
export async function getCurrentUsage(userId: string): Promise<TokenUsageResult> {
    const config = getServerConfig();
    const today = getTodayUTC();

    const usage = await prisma.tokenUsage.findUnique({
        where: {
            userId_date: {
                userId,
                date: today,
            },
        },
    });

    const used = usage?.totalTokens ?? 0;
    const limit = config.chat.dailyTokenLimit;
    const remaining = Math.max(0, limit - used);

    return {
        used,
        limit,
        remaining,
        resetAt: getTomorrowUTC(),
    };
}

/**
 * Check if user has available quota for a request
 */
export async function checkQuota(userId: string): Promise<QuotaCheckResult> {
    const usage = await getCurrentUsage(userId);
    const allowed = usage.remaining > 0;

    logger.debug({ userId, used: usage.used, remaining: usage.remaining, allowed }, 'Token quota check');

    return {
        allowed,
        usage,
    };
}

/**
 * Track token usage for a user
 * Creates or updates the daily token usage record
 */
export async function trackTokenUsage(userId: string, tokenCount: number): Promise<void> {
    const today = getTodayUTC();

    try {
        await prisma.tokenUsage.upsert({
            where: {
                userId_date: {
                    userId,
                    date: today,
                },
            },
            update: {
                totalTokens: {
                    increment: tokenCount,
                },
            },
            create: {
                userId,
                date: today,
                totalTokens: tokenCount,
            },
        });

        logger.debug({ userId, tokenCount, date: today }, 'Token usage tracked');
    } catch (error) {
        logger.error({ error, userId, tokenCount }, 'Failed to track token usage');
        throw error;
    }
}

/**
 * Check quota before operation and throw if exceeded
 * @throws Error if quota is exceeded
 */
export async function enforceQuota(userId: string): Promise<void> {
    const check = await checkQuota(userId);

    if (!check.allowed) {
        const resetTime = check.usage.resetAt.toISOString();
        logger.warn({ userId, used: check.usage.used, limit: check.usage.limit }, 'User exceeded daily token quota');
        throw new Error(
            `Daily token quota exceeded. Used ${check.usage.used}/${check.usage.limit} tokens. Quota resets at ${resetTime}.`,
        );
    }
}

/**
 * Update conversation total tokens after tracking
 */
export async function updateConversationTokens(conversationId: string, tokenCount: number): Promise<void> {
    try {
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                totalTokens: {
                    increment: tokenCount,
                },
            },
        });

        logger.debug({ conversationId, tokenCount }, 'Conversation tokens updated');
    } catch (error) {
        logger.error({ error, conversationId, tokenCount }, 'Failed to update conversation tokens');
        throw error;
    }
}
