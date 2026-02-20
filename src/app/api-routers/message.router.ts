import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from 'src/app/api-routers/init';
import { prisma } from 'src/shared/backend/prisma';
import { logger } from 'src/shared/backend/logger';
import { SEND_MESSAGE_USE_CASE } from 'src/shared/backend/container';
import {
    ConversationNotFoundError,
    ForbiddenError,
    RateLimitExceededError,
    QuotaExceededError,
    ValidationError,
} from 'src/shared/backend/use-cases/errors';
import type { SendMessageUseCase } from 'src/shared/backend/use-cases/send-message.use-case';

export const messageRouter = createTRPCRouter({
    /**
     * Get messages for a conversation
     */
    list: protectedProcedure
        .input(
            z.object({
                conversationId: z.string().cuid(),
                limit: z.number().int().positive().max(200).optional(),
                offset: z.number().int().nonnegative().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            // Verify conversation ownership
            const conversation = await prisma.conversation.findUnique({
                where: { id: input.conversationId },
                select: { userId: true },
            });

            if (!conversation) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Conversation not found',
                });
            }

            if (conversation.userId !== ctx.userId) {
                logger.warn(
                    { conversationId: input.conversationId, userId: ctx.userId },
                    'Unauthorized message access',
                );
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this conversation',
                });
            }

            // Get messages with PII detections
            const messages = await prisma.message.findMany({
                where: { conversationId: input.conversationId },
                orderBy: { createdAt: 'asc' },
                take: input.limit,
                skip: input.offset,
                select: {
                    id: true,
                    role: true,
                    content: true,
                    tokenCount: true,
                    createdAt: true,
                    piiDetections: {
                        select: {
                            piiType: true,
                            startOffset: true,
                            endOffset: true,
                        },
                        orderBy: { startOffset: 'asc' },
                    },
                },
            });

            // Transform messages to include piiMaskRegions in the expected format
            return messages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                tokenCount: msg.tokenCount,
                createdAt: msg.createdAt,
                piiMaskRegions: msg.piiDetections.map((detection) => ({
                    piiType: detection.piiType,
                    startOffset: detection.startOffset,
                    endOffset: detection.endOffset,
                    originalLength: detection.endOffset - detection.startOffset,
                })),
            }));
        }),

    /**
     * Send a message and get AI response
     */
    send: protectedProcedure
        .input(
            z.object({
                conversationId: z.string().cuid(),
                content: z.string().min(1),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const useCase = ctx.container.resolve<SendMessageUseCase>(SEND_MESSAGE_USE_CASE);

            try {
                return await useCase.execute({
                    userId: ctx.userId,
                    conversationId: input.conversationId,
                    content: input.content,
                });
            } catch (error) {
                if (error instanceof ConversationNotFoundError) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
                }
                if (error instanceof ForbiddenError) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
                }
                if (error instanceof RateLimitExceededError) {
                    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: error.message });
                }
                if (error instanceof QuotaExceededError) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
                }
                if (error instanceof ValidationError) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
                }

                logger.error(
                    { error, conversationId: input.conversationId, userId: ctx.userId },
                    'Failed to get AI response',
                );
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get AI response. Please try again.',
                });
            }
        }),
});
