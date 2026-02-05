import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from 'src/shared/api/trpc/init';
import {
    getPiiDetectionsByMessage,
    getPiiDetectionsByConversation,
    getPiiDetectionsByUser,
    queryPiiDetections,
} from './persistence';
import { PII_TYPES } from 'src/shared/config/env/server';

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
            const { prisma } = await import('src/shared/lib/prisma');
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

            return getPiiDetectionsByMessage(input.messageId);
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
            const { prisma } = await import('src/shared/lib/prisma');
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: input.conversationId,
                    userId: ctx.userId,
                },
            });

            if (!conversation) {
                throw new Error('Conversation not found or access denied');
            }

            return getPiiDetectionsByConversation(input.conversationId);
        }),

    /**
     * Get all PII detections for the current user
     */
    getByUser: protectedProcedure.query(async ({ ctx }) => {
        return getPiiDetectionsByUser(ctx.userId);
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
            return queryPiiDetections({
                userId: ctx.userId,
                conversationId: input.conversationId,
                piiType: input.piiType,
                startDate: input.startDate,
                endDate: input.endDate,
            });
        }),
});
