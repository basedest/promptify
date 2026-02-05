import { createTRPCRouter, protectedProcedure } from 'src/shared/api/trpc/init';
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
});
