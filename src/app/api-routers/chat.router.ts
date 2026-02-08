import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from 'src/app/api-routers/init';
import { prisma } from 'src/shared/backend/prisma';
import { getServerConfig } from 'src/shared/config/env';
import { logger } from 'src/shared/backend/logger';

export const chatRouter = createTRPCRouter({
    /**
     * Create a new chat
     */
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(1).max(50),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const config = getServerConfig();

            // Check chat limit
            const count = await prisma.conversation.count({
                where: { userId: ctx.userId },
            });

            if (count >= config.chat.maxConversationsPerUser) {
                logger.warn({ userId: ctx.userId, count }, 'User exceeded conversation limit');
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Maximum ${config.chat.maxConversationsPerUser} conversations allowed. Please delete old conversations.`,
                });
            }

            // Create conversation
            const conversation = await prisma.conversation.create({
                data: {
                    userId: ctx.userId,
                    title: input.title.slice(0, config.chat.maxConversationTitleLength),
                },
            });

            logger.info({ conversationId: conversation.id, userId: ctx.userId }, 'Conversation created');

            return conversation;
        }),

    /**
     * List all conversations for the current user
     */
    list: protectedProcedure.query(async ({ ctx }) => {
        const conversations = await prisma.conversation.findMany({
            where: { userId: ctx.userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                totalTokens: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { messages: true },
                },
            },
        });

        return conversations;
    }),

    /**
     * Get a single conversation with messages
     */
    get: protectedProcedure
        .input(
            z.object({
                id: z.string().cuid(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const conversation = await prisma.conversation.findUnique({
                where: { id: input.id },
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' },
                        select: {
                            id: true,
                            role: true,
                            content: true,
                            tokenCount: true,
                            createdAt: true,
                        },
                    },
                },
            });

            if (!conversation) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Conversation not found',
                });
            }

            // Validate ownership
            if (conversation.userId !== ctx.userId) {
                logger.warn({ conversationId: input.id, userId: ctx.userId }, 'Unauthorized conversation access');
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this conversation',
                });
            }

            return conversation;
        }),

    /**
     * Update a conversation (e.g. rename title)
     */
    update: protectedProcedure
        .input(
            z.object({
                id: z.string().cuid(),
                title: z.string().min(1).max(100),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const config = getServerConfig();
            const conversation = await prisma.conversation.findUnique({
                where: { id: input.id },
                select: { userId: true },
            });

            if (!conversation) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Conversation not found',
                });
            }

            if (conversation.userId !== ctx.userId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to update this conversation',
                });
            }

            const updated = await prisma.conversation.update({
                where: { id: input.id },
                data: {
                    title: input.title.slice(0, config.chat.maxConversationTitleLength),
                },
            });

            logger.info({ conversationId: input.id, userId: ctx.userId }, 'Conversation updated');

            return updated;
        }),

    /**
     * Delete a conversation (cascade deletes messages)
     */
    delete: protectedProcedure
        .input(
            z.object({
                id: z.string().cuid(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Check ownership before deleting
            const conversation = await prisma.conversation.findUnique({
                where: { id: input.id },
                select: { userId: true },
            });

            if (!conversation) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Conversation not found',
                });
            }

            if (conversation.userId !== ctx.userId) {
                logger.warn({ conversationId: input.id, userId: ctx.userId }, 'Unauthorized conversation deletion');
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to delete this conversation',
                });
            }

            // Delete conversation (cascade deletes messages)
            await prisma.conversation.delete({
                where: { id: input.id },
            });

            logger.info({ conversationId: input.id, userId: ctx.userId }, 'Conversation deleted');

            return { success: true };
        }),

    /**
     * Get chat count for current user
     */
    count: protectedProcedure.query(async ({ ctx }) => {
        const count = await prisma.conversation.count({
            where: { userId: ctx.userId },
        });

        const config = getServerConfig();

        return {
            count,
            limit: config.chat.maxConversationsPerUser,
            remaining: Math.max(0, config.chat.maxConversationsPerUser - count),
        };
    }),
});
