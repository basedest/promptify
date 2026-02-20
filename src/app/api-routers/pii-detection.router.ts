import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from 'src/app/api-routers/init';
import { PII_TYPES } from 'src/shared/config/env/server';
import { logger } from 'src/shared/backend/logger';
import {
    getBackendContainer,
    PII_DETECTION_REPOSITORY,
    PII_DETECTION_COST_TRACKER,
} from 'src/shared/backend/container';
import type { PiiDetectionRepository } from 'src/shared/backend/pii-detection';
import type { PiiDetectionCostTracker } from 'src/shared/backend/pii-detection';

const container = getBackendContainer();
const piiRepository = container.resolve<PiiDetectionRepository>(PII_DETECTION_REPOSITORY);
const piiCostTracker = container.resolve<PiiDetectionCostTracker>(PII_DETECTION_COST_TRACKER);

export const piiDetectionRouter = createTRPCRouter({
    /**
     * Get PII detections for a specific message
     */
    getByMessage: protectedProcedure
        .input(
            z.object({
                messageId: z.string().cuid(),
            }),
        )
        .query(async ({ ctx, input }) => {
            // Verify message belongs to user's conversation
            const { prisma } = await import('src/shared/backend/prisma');
            const message = await prisma.message.findFirst({
                where: {
                    id: input.messageId,
                    conversation: {
                        userId: ctx.userId,
                    },
                },
            });

            if (!message) {
                throw new Error('Message not found or access denied');
            }

            return piiRepository.findByMessage(input.messageId);
        }),

    /**
     * Get PII detections for a specific conversation
     */
    getByConversation: protectedProcedure
        .input(
            z.object({
                conversationId: z.string().cuid(),
            }),
        )
        .query(async ({ ctx, input }) => {
            // Verify conversation belongs to user
            const { prisma } = await import('src/shared/backend/prisma');
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: input.conversationId,
                    userId: ctx.userId,
                },
            });

            if (!conversation) {
                throw new Error('Conversation not found or access denied');
            }

            return piiRepository.findByConversation(input.conversationId);
        }),

    /**
     * Get all PII detections for the current user
     */
    getByUser: protectedProcedure.query(async ({ ctx }) => {
        return piiRepository.findByUser(ctx.userId);
    }),

    /**
     * Query PII detections with filters
     */
    query: protectedProcedure
        .input(
            z.object({
                conversationId: z.string().cuid().optional(),
                piiType: z.enum([...PII_TYPES] as [string, ...string[]]).optional(),
                startDate: z.date().optional(),
                endDate: z.date().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            return piiRepository.query({
                userId: ctx.userId,
                conversationId: input.conversationId,
                piiType: input.piiType,
                startDate: input.startDate,
                endDate: input.endDate,
            });
        }),

    /**
     * Get PII detection costs for the current user
     */
    getCosts: protectedProcedure
        .input(
            z.object({
                startDate: z.date().optional(),
                endDate: z.date().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            return piiCostTracker.getByUser(ctx.userId, input.startDate, input.endDate);
        }),

    /**
     * Get PII detection costs for a conversation
     */
    getCostsByConversation: protectedProcedure
        .input(
            z.object({
                conversationId: z.string().cuid(),
                startDate: z.date().optional(),
                endDate: z.date().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            // Verify conversation belongs to user
            const { prisma } = await import('src/shared/backend/prisma');
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: input.conversationId,
                    userId: ctx.userId,
                },
            });

            if (!conversation) {
                throw new Error('Conversation not found or access denied');
            }

            return piiCostTracker.getByConversation(input.conversationId, input.startDate, input.endDate);
        }),

    /**
     * Log PII unmask action for audit (AC4, NFR3)
     * Only authenticated users can unmask their own PII
     */
    logUnmask: protectedProcedure
        .input(
            z.object({
                messageId: z.string().cuid(),
                piiType: z.string(),
                action: z.enum(['reveal', 'hide']),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Verify message belongs to user's conversation (authentication check)
            const { prisma } = await import('src/shared/backend/prisma');
            const message = await prisma.message.findFirst({
                where: {
                    id: input.messageId,
                    conversation: {
                        userId: ctx.userId,
                    },
                },
                select: {
                    id: true,
                    conversationId: true,
                },
            });

            if (!message) {
                throw new Error('Message not found or access denied');
            }

            // Log unmask action for audit (AC4)
            // Never log original PII values
            logger.info(
                {
                    userId: ctx.userId,
                    messageId: input.messageId,
                    conversationId: message.conversationId,
                    piiType: input.piiType,
                    action: input.action,
                    timestamp: new Date().toISOString(),
                },
                'PII unmask action',
            );

            return { success: true };
        }),
});
