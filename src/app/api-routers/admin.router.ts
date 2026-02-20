import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from './init';
import { getBackendContainer, PII_DETECTION_COST_TRACKER } from 'src/shared/backend/container';
import type { PiiDetectionCostTracker } from 'src/shared/backend/pii-detection';

const piiCostTracker = getBackendContainer().resolve<PiiDetectionCostTracker>(PII_DETECTION_COST_TRACKER);

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
            return piiCostTracker.getAggregate({
                startDate: input?.startDate,
                endDate: input?.endDate,
                userId: input?.userId,
            });
        }),
});
