import { createTRPCRouter, protectedProcedure } from 'src/shared/api/trpc/init';
import { getServerConfig } from 'src/shared/config/env';
import { prisma } from 'src/shared/lib/prisma';
import { getCurrentUsage } from './service';

export const tokenTrackingRouter = createTRPCRouter({
    /**
     * Get current token usage for the user
     */
    getUsage: protectedProcedure.query(async ({ ctx }) => {
        const usage = await getCurrentUsage(ctx.userId);

        return {
            used: usage.used,
            limit: usage.limit,
            remaining: usage.remaining,
            percentage: Math.min(100, (usage.used / usage.limit) * 100),
            resetAt: usage.resetAt,
        };
    }),

    /**
     * Get all user quotas for the Account page (token + conversation usage)
     */
    getAccountQuotas: protectedProcedure.query(async ({ ctx }) => {
        const config = getServerConfig();
        const [tokenUsage, conversationCount] = await Promise.all([
            getCurrentUsage(ctx.userId),
            prisma.conversation.count({ where: { userId: ctx.userId } }),
        ]);

        const conversationLimit = config.chat.maxConversationsPerUser;
        const conversationRemaining = Math.max(0, conversationLimit - conversationCount);

        return {
            token: {
                used: tokenUsage.used,
                limit: tokenUsage.limit,
                remaining: tokenUsage.remaining,
                resetAt: tokenUsage.resetAt,
            },
            conversation: {
                count: conversationCount,
                limit: conversationLimit,
                remaining: conversationRemaining,
            },
        };
    }),
});
