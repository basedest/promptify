import 'server-only';
import type {
    IChatClient,
    IRateLimiter,
    ITokenTracker,
    IPiiDetectionService,
    IMessageRepository,
} from 'src/shared/backend/ports';
import type { ChatMessage } from 'src/shared/backend/openrouter';
import type { ServerConfig } from 'src/shared/config/env/server';
import type { PiiDetectionResult } from 'src/shared/backend/pii-detection/types';
import { extractBatchesFromBuffer } from 'src/shared/backend/pii-detection';
import { logger } from 'src/shared/backend/logger';
import { sanitizeInput } from 'src/shared/backend/lib/sanitize';
import {
    ConversationNotFoundError,
    ForbiddenError,
    RateLimitExceededError,
    QuotaExceededError,
    ValidationError,
} from './errors';

export type ChatStreamUseCaseDeps = {
    chatClient: IChatClient;
    rateLimiter: IRateLimiter;
    tokenTracker: ITokenTracker;
    piiService: IPiiDetectionService;
    messageRepo: IMessageRepository;
    config: ServerConfig;
};

export type ChatStreamParams = {
    userId: string;
    conversationId: string;
    content: string;
};

export class ChatStreamUseCase {
    constructor(private readonly deps: ChatStreamUseCaseDeps) {}

    async execute(params: ChatStreamParams): Promise<ReadableStream<Uint8Array>> {
        const { userId, conversationId, content } = params;
        const { chatClient, rateLimiter, tokenTracker, piiService, messageRepo, config } = this.deps;

        const sanitizedContent = sanitizeInput(content);
        if (sanitizedContent.length === 0) {
            throw new ValidationError('Message cannot be empty');
        }

        const conversation = await messageRepo.findConversation(conversationId);
        if (!conversation) {
            throw new ConversationNotFoundError('Conversation not found');
        }
        if (conversation.userId !== userId) {
            logger.warn({ conversationId, userId }, 'Unauthorized streaming access');
            throw new ForbiddenError('Forbidden');
        }
        if (conversation.messageCount >= config.chat.maxMessagesPerConversation) {
            throw new ValidationError(
                `Maximum ${config.chat.maxMessagesPerConversation} messages per conversation reached`,
            );
        }

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

        const userMessage = await messageRepo.createMessage({
            conversationId,
            role: 'user',
            content: sanitizedContent,
            tokenCount: 0,
        });

        const contextMessages = await messageRepo.findContextMessages(conversationId, config.chat.contextWindowSize);
        const messages: ChatMessage[] = [...contextMessages, { role: 'user', content: sanitizedContent }];

        const piiConfig = config.piiDetection;
        const piiEnabled = piiConfig.enabled;

        return new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let assistantContent = '';
                let promptTokens = 0;
                let completionTokens = 0;
                let assistantMessageId: string | null = null;
                let contentBuffer = '';
                let sentOriginalLength = 0;
                const allDetections: PiiDetectionResult[] = [];
                const detectionPromises: Promise<void>[] = [];

                const sendEvent = (event: unknown) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                };

                const runDetectionAsync = (text: string, baseOffset: number): Promise<void> | void => {
                    if (!piiEnabled || !text.trim()) return;
                    const promise = (async () => {
                        try {
                            const result = await piiService.detectPii(text, { userId, conversationId });
                            if (result.success && result.detections.length > 0) {
                                const adjusted: PiiDetectionResult[] = result.detections.map((d) => ({
                                    ...d,
                                    startOffset: baseOffset + d.startOffset,
                                    endOffset: baseOffset + d.endOffset,
                                }));
                                allDetections.push(...adjusted);
                                for (const d of adjusted) {
                                    sendEvent({
                                        type: 'pii_mask',
                                        startOffset: d.startOffset,
                                        endOffset: d.endOffset,
                                        piiType: d.piiType,
                                        originalLength: d.endOffset - d.startOffset,
                                    });
                                }
                                const maskedText = piiService.maskPiiInText(text, result.detections);
                                logger.info(
                                    {
                                        conversationId,
                                        userId,
                                        detectionCount: result.detections.length,
                                        piiTypes: result.detections.map((x) => x.piiType),
                                        maskedText,
                                    },
                                    'PII detected asynchronously in stream',
                                );
                            }
                        } catch (error) {
                            logger.error(
                                { error, conversationId, userId },
                                'Async PII detection error, continuing stream',
                            );
                        }
                    })();
                    detectionPromises.push(promise);
                    return promise;
                };

                try {
                    for await (const chunk of chatClient.createChatCompletionStream(messages)) {
                        if (chunk.choices[0]?.delta?.content) {
                            const c = chunk.choices[0].delta.content;
                            assistantContent += c;
                            sendEvent({ type: 'content', content: c });
                            sentOriginalLength += c.length;

                            if (piiEnabled) {
                                contentBuffer += c;
                                const baseOffset = sentOriginalLength - contentBuffer.length;
                                const { batches, remaining } = extractBatchesFromBuffer(
                                    contentBuffer,
                                    piiConfig.maxBatchChars,
                                );
                                contentBuffer = remaining;
                                let offset = baseOffset;
                                for (const batch of batches) {
                                    runDetectionAsync(batch, offset);
                                    offset += batch.length;
                                }
                            }
                        }
                        if (chunk.usage) {
                            promptTokens = chunk.usage.prompt_tokens ?? 0;
                            completionTokens = chunk.usage.completion_tokens ?? 0;
                        }
                    }

                    await Promise.all(detectionPromises);

                    if (promptTokens === 0 && completionTokens === 0) {
                        promptTokens = chatClient.estimateTokenCount(messages);
                        completionTokens = chatClient.estimateTokenCount([
                            { role: 'assistant', content: assistantContent },
                        ]);
                    }
                    const totalTokens = promptTokens + completionTokens;

                    const assistantMessage = await messageRepo.createMessage({
                        conversationId,
                        role: 'assistant',
                        content: assistantContent,
                        tokenCount: completionTokens,
                    });
                    assistantMessageId = assistantMessage.id;

                    if (piiEnabled && allDetections.length > 0 && assistantMessage.id) {
                        piiService.persistDetections(assistantMessage.id, allDetections).catch((error) => {
                            logger.error(
                                { error, messageId: assistantMessage.id },
                                'Background PII persistence failed',
                            );
                        });
                    }

                    await messageRepo.updateMessageTokenCount(userMessage.id, promptTokens);
                    await tokenTracker.trackUsage(userId, totalTokens);
                    await tokenTracker.updateConversationTokens(conversationId, totalTokens);

                    sendEvent({
                        type: 'done',
                        userMessageId: userMessage.id,
                        assistantMessageId: assistantMessage.id,
                        totalTokens,
                    });

                    logger.info(
                        { conversationId, userId, promptTokens, completionTokens, totalTokens },
                        'Streaming response completed',
                    );
                    controller.close();
                } catch (error) {
                    logger.error({ error, conversationId, userId }, 'Streaming error');
                    sendEvent({ type: 'error', error: 'Failed to get AI response' });
                    if (!assistantMessageId) {
                        await messageRepo.deleteMessage(userMessage.id).catch(() => {});
                    }
                    controller.close();
                }
            },
        });
    }
}
