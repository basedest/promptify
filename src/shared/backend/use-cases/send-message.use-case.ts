import 'server-only';
import type { IChatClient, IRateLimiter, ITokenTracker, IMessageRepository } from 'src/shared/backend/ports';
import type { ChatMessage } from 'src/shared/backend/openrouter';
import type { ServerConfig } from 'src/shared/config/env/server';
import { logger } from 'src/shared/backend/logger';
import { sanitizeInput } from 'src/shared/backend/lib/sanitize';
import { calculateCost, getModelById, isValidModelId } from 'src/shared/backend/model-service';
import { DEFAULT_MODEL_ID } from 'src/shared/config/models';
import type { PrismaClient } from 'src/generated/prisma/client';
import {
    ConversationNotFoundError,
    ForbiddenError,
    RateLimitExceededError,
    QuotaExceededError,
    ValidationError,
} from './errors';

export type SendMessageUseCaseDeps = {
    chatClient: IChatClient;
    rateLimiter: IRateLimiter;
    tokenTracker: ITokenTracker;
    messageRepo: IMessageRepository;
    config: ServerConfig;
    prisma: PrismaClient;
};

export type SendMessageParams = {
    userId: string;
    conversationId: string;
    content: string;
    model?: string;
};

export type SendMessageResult = {
    userMessage: {
        id: string;
        role: string;
        content: string;
        tokenCount: number;
        createdAt: Date;
    };
    assistantMessage: {
        id: string;
        role: string;
        content: string;
        tokenCount: number;
        createdAt: Date;
    };
};

export class SendMessageUseCase {
    constructor(private readonly deps: SendMessageUseCaseDeps) {}

    async execute(params: SendMessageParams): Promise<SendMessageResult> {
        const { userId, conversationId, content } = params;
        const { chatClient, rateLimiter, tokenTracker, messageRepo, config, prisma } = this.deps;

        const sanitizedContent = sanitizeInput(content);
        if (sanitizedContent.length === 0) {
            throw new ValidationError('Message cannot be empty');
        }
        if (sanitizedContent.length > config.chat.maxMessageLength) {
            throw new ValidationError(`Message too long. Maximum ${config.chat.maxMessageLength} characters allowed.`);
        }

        const conversation = await messageRepo.findConversation(conversationId);
        if (!conversation) {
            throw new ConversationNotFoundError('Conversation not found');
        }
        if (conversation.userId !== userId) {
            logger.warn({ conversationId, userId }, 'Unauthorized message send');
            throw new ForbiddenError('You do not have access to this conversation');
        }
        if (conversation.messageCount >= config.chat.maxMessagesPerConversation) {
            throw new ValidationError(
                `Maximum ${config.chat.maxMessagesPerConversation} messages per conversation reached.`,
            );
        }

        const resolvedModel = params.model ?? conversation.modelId ?? DEFAULT_MODEL_ID;
        if (!(await isValidModelId(prisma, resolvedModel))) {
            throw new ValidationError(`Invalid model: ${resolvedModel}`);
        }

        const modelDef = await getModelById(prisma, resolvedModel);

        try {
            rateLimiter.enforce(userId);
        } catch (error) {
            throw new RateLimitExceededError(error instanceof Error ? error.message : 'Rate limit exceeded');
        }

        try {
            await tokenTracker.enforceQuota(userId);
        } catch (error) {
            throw new QuotaExceededError(error instanceof Error ? error.message : 'Token quota exceeded');
        }

        const userPosition = await messageRepo.getNextPosition(conversationId);
        const userMessage = await messageRepo.createMessage({
            conversationId,
            role: 'user',
            content: sanitizedContent,
            tokenCount: 0,
            position: userPosition,
        });

        try {
            const contextMessages = await messageRepo.findContextMessages(
                conversationId,
                config.chat.contextWindowSize,
            );
            const messages: ChatMessage[] = [...contextMessages, { role: 'user', content: sanitizedContent }];

            let assistantContent = '';
            let promptTokens = 0;
            let completionTokens = 0;

            for await (const chunk of chatClient.createChatCompletionStream(messages, { model: resolvedModel })) {
                if (chunk.choices[0]?.delta?.content) {
                    assistantContent += chunk.choices[0].delta.content;
                }
                if (chunk.usage) {
                    promptTokens = chunk.usage.prompt_tokens ?? 0;
                    completionTokens = chunk.usage.completion_tokens ?? 0;
                }
            }

            if (promptTokens === 0 && completionTokens === 0) {
                promptTokens = chatClient.estimateTokenCount(messages);
                completionTokens = chatClient.estimateTokenCount([{ role: 'assistant', content: assistantContent }]);
            }
            const totalTokens = promptTokens + completionTokens;
            const cost = calculateCost(modelDef, promptTokens, completionTokens); // micro-USD

            const assistantPosition = await messageRepo.getNextPosition(conversationId);
            const assistantMessage = await messageRepo.createMessage({
                conversationId,
                role: 'assistant',
                content: assistantContent,
                tokenCount: completionTokens,
                modelId: resolvedModel,
                cost,
                position: assistantPosition,
                inputCostPer1MSnapshot: modelDef?.inputCostPer1M,
                outputCostPer1MSnapshot: modelDef?.outputCostPer1M,
            });

            await messageRepo.updateMessageTokenCount(userMessage.id, promptTokens);
            await tokenTracker.trackUsage(userId, totalTokens, cost);
            await tokenTracker.updateConversationTokens(conversationId, totalTokens, cost);

            logger.info(
                { conversationId, userId, promptTokens, completionTokens, totalTokens },
                'Message sent and AI response received',
            );

            return {
                userMessage: {
                    id: userMessage.id,
                    role: 'user',
                    content: sanitizedContent,
                    tokenCount: promptTokens,
                    createdAt: userMessage.createdAt,
                },
                assistantMessage: {
                    id: assistantMessage.id,
                    role: 'assistant',
                    content: assistantContent,
                    tokenCount: completionTokens,
                    createdAt: assistantMessage.createdAt,
                },
            };
        } catch (error) {
            await messageRepo.softDeleteMessage(userMessage.id).catch(() => {});
            logger.error({ error, conversationId, userId }, 'Failed to get AI response');
            throw error;
        }
    }
}
