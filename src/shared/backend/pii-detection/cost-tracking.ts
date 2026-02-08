import 'server-only';
import { prisma } from 'src/shared/backend/prisma';
import { logger } from 'src/shared/backend/logger';

/**
 * Get today's date at midnight UTC for daily cost tracking
 */
function getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Track PII detection API call costs
 * This is separate from user token quotas - PII detection costs are tracked separately
 * @param params - Tracking parameters
 */
export async function trackPiiDetectionCost(params: {
    userId?: string;
    conversationId?: string;
    tokens: number;
    latencyMs: number;
    success: boolean;
}): Promise<void> {
    const today = getTodayUTC();

    try {
        // Prisma unique constraint requires non-null values, so we use a placeholder for nulls
        const userIdForQuery = params.userId ?? '';
        const conversationIdForQuery = params.conversationId ?? '';

        await prisma.piiDetectionCost.upsert({
            where: {
                userId_conversationId_date: {
                    userId: userIdForQuery,
                    conversationId: conversationIdForQuery,
                    date: today,
                },
            },
            update: {
                requestCount: {
                    increment: 1,
                },
                totalTokens: {
                    increment: params.tokens,
                },
                totalLatencyMs: {
                    increment: params.latencyMs,
                },
                errorCount: params.success
                    ? undefined
                    : {
                          increment: 1,
                      },
            },
            create: {
                userId: params.userId ?? null,
                conversationId: params.conversationId ?? null,
                date: today,
                requestCount: 1,
                totalTokens: params.tokens,
                totalLatencyMs: params.latencyMs,
                errorCount: params.success ? 0 : 1,
            },
        });

        logger.debug(
            {
                userId: params.userId,
                conversationId: params.conversationId,
                tokens: params.tokens,
                latencyMs: params.latencyMs,
                success: params.success,
            },
            'PII detection cost tracked',
        );
    } catch (error) {
        // Never throw - cost tracking failures must not break PII detection
        logger.error(
            {
                error,
                userId: params.userId,
                conversationId: params.conversationId,
            },
            'Failed to track PII detection cost',
        );
    }
}

/**
 * Get PII detection costs for a user
 */
export async function getPiiDetectionCostsByUser(userId: string, startDate?: Date, endDate?: Date) {
    const where: {
        userId: string;
        date?: { gte?: Date; lte?: Date };
    } = {
        userId,
    };

    if (startDate || endDate) {
        where.date = {};
        if (startDate) {
            where.date.gte = startDate;
        }
        if (endDate) {
            where.date.lte = endDate;
        }
    }

    return prisma.piiDetectionCost.findMany({
        where,
        orderBy: {
            date: 'desc',
        },
    });
}

/**
 * Get PII detection costs for a conversation
 */
export async function getPiiDetectionCostsByConversation(conversationId: string, startDate?: Date, endDate?: Date) {
    const where: {
        conversationId: string;
        date?: { gte?: Date; lte?: Date };
    } = {
        conversationId,
    };

    if (startDate || endDate) {
        where.date = {};
        if (startDate) {
            where.date.gte = startDate;
        }
        if (endDate) {
            where.date.lte = endDate;
        }
    }

    return prisma.piiDetectionCost.findMany({
        where,
        orderBy: {
            date: 'desc',
        },
    });
}

/**
 * Get aggregate PII detection costs (admin function)
 */
export async function getAggregatePiiDetectionCosts(filters?: { startDate?: Date; endDate?: Date; userId?: string }) {
    const where: {
        date?: { gte?: Date; lte?: Date };
        userId?: string;
    } = {};

    if (filters?.startDate || filters?.endDate) {
        where.date = {};
        if (filters.startDate) {
            where.date.gte = filters.startDate;
        }
        if (filters.endDate) {
            where.date.lte = filters.endDate;
        }
    }

    if (filters?.userId) {
        where.userId = filters.userId;
    }

    const costs = await prisma.piiDetectionCost.findMany({
        where,
        orderBy: {
            date: 'desc',
        },
    });

    // Calculate aggregates
    const totalRequests = costs.reduce((sum, cost) => sum + cost.requestCount, 0);
    const totalTokens = costs.reduce((sum, cost) => sum + cost.totalTokens, 0);
    const totalLatencyMs = costs.reduce((sum, cost) => sum + cost.totalLatencyMs, 0);
    const totalErrors = costs.reduce((sum, cost) => sum + cost.errorCount, 0);
    const avgLatencyMs = totalRequests > 0 ? totalLatencyMs / totalRequests : 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
        totalRequests,
        totalTokens,
        totalLatencyMs,
        totalErrors,
        avgLatencyMs: Math.round(avgLatencyMs * 100) / 100,
        errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimal places
        costs,
    };
}
