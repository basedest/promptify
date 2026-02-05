import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from 'src/shared/api/trpc/init';
import { prisma } from 'src/shared/lib/prisma';
import { getServerConfig } from 'src/shared/config/env';
import { logger } from 'src/shared/lib/logger';
import { enforceRateLimit } from 'src/shared/lib/rate-limit';
import { enforceQuota, trackTokenUsage, updateConversationTokens } from 'src/shared/lib/token-tracking';
import { getOpenRouterClient, type ChatMessage } from 'src/shared/lib/openrouter';

/**
 * Sanitize user input: strip HTML tags and trim whitespace
 */
function sanitizeInput(input: string): string {
    return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Get last N messages for context window
 */
async function getContextMessages(conversationId: string, limit: number): Promise<ChatMessage[]> {
    const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            role: true,
            content: true,
        },
    });

    // Reverse to get chronological order
    return messages.reverse().map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
    }));
}

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

            // Get messages
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
                },
            });

            return messages;
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
            const config = getServerConfig();

            // Sanitize input
            const sanitizedContent = sanitizeInput(input.content);

            // Validate message length
            if (sanitizedContent.length > config.chat.maxMessageLength) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Message too long. Maximum ${config.chat.maxMessageLength} characters allowed.`,
                });
            }

            if (sanitizedContent.length === 0) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Message cannot be empty',
                });
            }

            // Verify conversation ownership
            const conversation = await prisma.conversation.findUnique({
                where: { id: input.conversationId },
                select: { userId: true, _count: { select: { messages: true } } },
            });

            if (!conversation) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Conversation not found',
                });
            }

            if (conversation.userId !== ctx.userId) {
                logger.warn({ conversationId: input.conversationId, userId: ctx.userId }, 'Unauthorized message send');
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this conversation',
                });
            }

            // Check message count limit
            if (conversation._count.messages >= config.chat.maxMessagesPerConversation) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Maximum ${config.chat.maxMessagesPerConversation} messages per conversation reached.`,
                });
            }

            // Enforce rate limiting
            try {
                enforceRateLimit(ctx.userId);
            } catch (error) {
                throw new TRPCError({
                    code: 'TOO_MANY_REQUESTS',
                    message: error instanceof Error ? error.message : 'Rate limit exceeded',
                });
            }

            // Enforce token quota
            try {
                await enforceQuota(ctx.userId);
            } catch (error) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: error instanceof Error ? error.message : 'Token quota exceeded',
                });
            }

            // Save user message
            const userMessage = await prisma.message.create({
                data: {
                    conversationId: input.conversationId,
                    role: 'user',
                    content: sanitizedContent,
                    tokenCount: 0, // Will be updated after AI response
                },
            });

            try {
                // Get context messages (last N messages)
                const contextMessages = await getContextMessages(input.conversationId, config.chat.contextWindowSize);

                // Add current user message to context
                const messages: ChatMessage[] = [...contextMessages, { role: 'user', content: sanitizedContent }];

                // Get AI response
                const aiClient = getOpenRouterClient();
                let assistantContent = '';
                let totalTokens = 0;

                // Stream and collect response
                for await (const chunk of aiClient.createChatCompletionStream(messages)) {
                    if (chunk.choices[0]?.delta?.content) {
                        assistantContent += chunk.choices[0].delta.content;
                    }

                    // Get token usage from final chunk
                    if (chunk.usage) {
                        totalTokens = chunk.usage.total_tokens;
                    }
                }

                // If no token usage in stream, estimate
                if (totalTokens === 0) {
                    totalTokens =
                        aiClient.estimateTokenCount(messages) +
                        aiClient.estimateTokenCount([{ role: 'assistant', content: assistantContent }]);
                }

                // Save assistant message
                const assistantMessage = await prisma.message.create({
                    data: {
                        conversationId: input.conversationId,
                        role: 'assistant',
                        content: assistantContent,
                        tokenCount: totalTokens,
                    },
                });

                // Update user message with token count
                await prisma.message.update({
                    where: { id: userMessage.id },
                    data: { tokenCount: totalTokens },
                });

                // Track token usage
                await trackTokenUsage(ctx.userId, totalTokens);
                await updateConversationTokens(input.conversationId, totalTokens);

                logger.info(
                    {
                        conversationId: input.conversationId,
                        userId: ctx.userId,
                        totalTokens,
                    },
                    'Message sent and AI response received',
                );

                return {
                    userMessage: {
                        id: userMessage.id,
                        role: userMessage.role,
                        content: userMessage.content,
                        tokenCount: totalTokens,
                        createdAt: userMessage.createdAt,
                    },
                    assistantMessage: {
                        id: assistantMessage.id,
                        role: assistantMessage.role,
                        content: assistantMessage.content,
                        tokenCount: totalTokens,
                        createdAt: assistantMessage.createdAt,
                    },
                };
            } catch (error) {
                // Delete user message if AI request failed
                await prisma.message.delete({ where: { id: userMessage.id } }).catch(() => {
                    // Ignore cleanup errors
                });

                logger.error(
                    {
                        error,
                        conversationId: input.conversationId,
                        userId: ctx.userId,
                    },
                    'Failed to get AI response',
                );

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get AI response. Please try again.',
                });
            }
        }),
});
