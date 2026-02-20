import 'server-only';
import type { PrismaClient } from 'src/generated/prisma/client';
import { logger } from 'src/shared/backend/logger';

export type PiiDetectionCostTrackParams = {
    userId?: string;
    conversationId?: string;
    tokens: number;
    latencyMs: number;
    success: boolean;
};

export type PiiDetectionCostAggregateFilters = {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
};

function getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Tracks PII detection API call costs (separate from user token quotas).
 * Single Responsibility: record and query PII detection cost metrics.
 * Dependency Inversion: depends on Prisma client injected via constructor.
 */
export class PiiDetectionCostTracker {
    constructor(private readonly prisma: PrismaClient) {}

    /**
     * Track a PII detection API call. Failures are logged but not thrown.
     */
    async track(params: PiiDetectionCostTrackParams): Promise<void> {
        const today = getTodayUTC();
        const userIdForQuery = params.userId ?? '';
        const conversationIdForQuery = params.conversationId ?? '';

        try {
            await this.prisma.piiDetectionCost.upsert({
                where: {
                    userId_conversationId_date: {
                        userId: userIdForQuery,
                        conversationId: conversationIdForQuery,
                        date: today,
                    },
                },
                update: {
                    requestCount: { increment: 1 },
                    totalTokens: { increment: params.tokens },
                    totalLatencyMs: { increment: params.latencyMs },
                    errorCount: params.success ? undefined : { increment: 1 },
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

    async getByUser(userId: string, startDate?: Date, endDate?: Date) {
        const where: {
            userId: string;
            date?: { gte?: Date; lte?: Date };
        } = { userId };

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = startDate;
            if (endDate) where.date.lte = endDate;
        }

        return this.prisma.piiDetectionCost.findMany({
            where,
            orderBy: { date: 'desc' },
        });
    }

    async getByConversation(conversationId: string, startDate?: Date, endDate?: Date) {
        const where: {
            conversationId: string;
            date?: { gte?: Date; lte?: Date };
        } = { conversationId };

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = startDate;
            if (endDate) where.date.lte = endDate;
        }

        return this.prisma.piiDetectionCost.findMany({
            where,
            orderBy: { date: 'desc' },
        });
    }

    async getAggregate(filters?: PiiDetectionCostAggregateFilters) {
        const where: {
            date?: { gte?: Date; lte?: Date };
            userId?: string;
        } = {};

        if (filters?.startDate || filters?.endDate) {
            where.date = {};
            if (filters.startDate) where.date.gte = filters.startDate;
            if (filters.endDate) where.date.lte = filters.endDate;
        }

        if (filters?.userId) {
            where.userId = filters.userId;
        }

        const costs = await this.prisma.piiDetectionCost.findMany({
            where,
            orderBy: { date: 'desc' },
        });

        const totalRequests = costs.reduce((sum, c) => sum + c.requestCount, 0);
        const totalTokens = costs.reduce((sum, c) => sum + c.totalTokens, 0);
        const totalLatencyMs = costs.reduce((sum, c) => sum + c.totalLatencyMs, 0);
        const totalErrors = costs.reduce((sum, c) => sum + c.errorCount, 0);
        const avgLatencyMs = totalRequests > 0 ? totalLatencyMs / totalRequests : 0;
        const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

        return {
            totalRequests,
            totalTokens,
            totalLatencyMs,
            totalErrors,
            avgLatencyMs: Math.round(avgLatencyMs * 100) / 100,
            errorRate: Math.round(errorRate * 10000) / 100,
            costs,
        };
    }
}
