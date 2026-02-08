import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from './init';
import { getAggregatePiiDetectionCosts } from 'src/shared/backend/pii-detection/cost-tracking';

/**
 * Admin router for monitoring PII detection costs
 * Note: In a production system, you'd want to add admin role checks here
 */
export const piiDetectionAdminRouter = createTRPCRouter({
    /**
     * Get aggregate PII detection costs
     * Allows filtering by date range and optionally by user
     */
    getAggregateCosts: protectedProcedure
        .input(
            z
                .object({
                    startDate: z.date().optional(),
                    endDate: z.date().optional(),
                    userId: z.string().cuid().optional(),
                })
                .optional(),
        )
        .query(async ({ input }) => {
            return getAggregatePiiDetectionCosts({
                startDate: input?.startDate,
                endDate: input?.endDate,
                userId: input?.userId,
            });
        }),
});
