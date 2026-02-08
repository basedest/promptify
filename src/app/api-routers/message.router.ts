import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from 'src/app/api-routers/init';
import { prisma } from 'src/shared/backend/prisma';
import { getServerConfig } from 'src/shared/config/env';
import { logger } from 'src/shared/backend/logger';
import { enforceRateLimit } from 'src/shared/backend/rate-limit';
import { enforceQuota, trackTokenUsage, updateConversationTokens } from 'src/shared/backend/token-tracking';
import { getOpenRouterClient, type ChatMessage } from 'src/shared/backend/openrouter';

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
                let promptTokens = 0;
                let completionTokens = 0;

                // Stream and collect response
                for await (const chunk of aiClient.createChatCompletionStream(messages)) {
                    if (chunk.choices[0]?.delta?.content) {
                        assistantContent += chunk.choices[0].delta.content;
                    }

                    // Get token usage from final chunk (OpenRouter sends usage in last chunk)
                    if (chunk.usage) {
                        promptTokens = chunk.usage.prompt_tokens ?? 0;
                        completionTokens = chunk.usage.completion_tokens ?? 0;
                    }
                }

                // If no token usage in stream, estimate per message type
                if (promptTokens === 0 && completionTokens === 0) {
                    promptTokens = aiClient.estimateTokenCount(messages);
                    completionTokens = aiClient.estimateTokenCount([{ role: 'assistant', content: assistantContent }]);
                }
                const totalTokens = promptTokens + completionTokens;

                // Save assistant message (reply tokens)
                const assistantMessage = await prisma.message.create({
                    data: {
                        conversationId: input.conversationId,
                        role: 'assistant',
                        content: assistantContent,
                        tokenCount: completionTokens,
                    },
                });

                // Update user message with input (prompt) token count
                await prisma.message.update({
                    where: { id: userMessage.id },
                    data: { tokenCount: promptTokens },
                });

                // Track token usage (total for quota)
                await trackTokenUsage(ctx.userId, totalTokens);
                await updateConversationTokens(input.conversationId, totalTokens);

                logger.info(
                    {
                        conversationId: input.conversationId,
                        userId: ctx.userId,
                        promptTokens,
                        completionTokens,
                        totalTokens,
                    },
                    'Message sent and AI response received',
                );

                return {
                    userMessage: {
                        id: userMessage.id,
                        role: userMessage.role,
                        content: userMessage.content,
                        tokenCount: promptTokens,
                        createdAt: userMessage.createdAt,
                    },
                    assistantMessage: {
                        id: assistantMessage.id,
                        role: assistantMessage.role,
                        content: assistantMessage.content,
                        tokenCount: completionTokens,
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
