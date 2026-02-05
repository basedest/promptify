import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from 'src/shared/lib/auth';
import { prisma } from 'src/shared/lib/prisma';
import { getServerConfig } from 'src/shared/config/env';
import { logger } from 'src/shared/lib/logger';
import { enforceRateLimit } from 'src/shared/lib/rate-limit';
import { enforceQuota, trackTokenUsage, updateConversationTokens } from 'src/shared/lib/token-tracking';
import { getOpenRouterClient, type ChatMessage } from 'src/shared/lib/openrouter';
import { getPiiDetectionService, maskPiiInText, persistPiiDetections } from 'src/shared/lib/pii-detection';
import type { PiiDetectionResult } from 'src/shared/lib/pii-detection';

const requestSchema = z.object({
    conversationId: z.string().cuid(),
    content: z.string().min(1).max(4000),
});

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

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const userId = session.user.id;

        // Parse and validate request body
        const body = await request.json();
        const parseResult = requestSchema.safeParse(body);

        if (!parseResult.success) {
            return new Response(JSON.stringify({ error: 'Invalid request', details: parseResult.error.issues }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { conversationId, content } = parseResult.data;
        const sanitizedContent = sanitizeInput(content);

        if (sanitizedContent.length === 0) {
            return new Response(JSON.stringify({ error: 'Message cannot be empty' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verify conversation ownership
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId: true, _count: { select: { messages: true } } },
        });

        if (!conversation) {
            return new Response(JSON.stringify({ error: 'Conversation not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (conversation.userId !== userId) {
            logger.warn({ conversationId, userId }, 'Unauthorized streaming access');
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check message count limit
        const config = getServerConfig();
        if (conversation._count.messages >= config.chat.maxMessagesPerConversation) {
            return new Response(
                JSON.stringify({
                    error: `Maximum ${config.chat.maxMessagesPerConversation} messages per conversation reached`,
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // Enforce rate limiting
        try {
            enforceRateLimit(userId);
        } catch (error) {
            return new Response(
                JSON.stringify({
                    error: error instanceof Error ? error.message : 'Rate limit exceeded',
                }),
                {
                    status: 429,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // Enforce token quota
        try {
            await enforceQuota(userId);
        } catch (error) {
            return new Response(
                JSON.stringify({
                    error: error instanceof Error ? error.message : 'Token quota exceeded',
                }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // Save user message
        const userMessage = await prisma.message.create({
            data: {
                conversationId,
                role: 'user',
                content: sanitizedContent,
                tokenCount: 0, // Will be updated after AI response
            },
        });

        // Get context messages
        const contextMessages = await getContextMessages(conversationId, config.chat.contextWindowSize);

        // Add current user message to context
        const messages: ChatMessage[] = [...contextMessages, { role: 'user', content: sanitizedContent }];

        // Create streaming response
        const aiClient = getOpenRouterClient();
        let assistantContent = '';
        let promptTokens = 0;
        let completionTokens = 0;
        let assistantMessageId: string | null = null;

        // PII detection state
        const piiConfig = config.piiDetection;
        const piiEnabled = piiConfig.enabled;
        let chunkCount = 0;
        let contentBuffer = ''; // Buffer for batch detection (original unmasked content)
        let sentOriginalLength = 0; // Track length of original content sent (for retroactive masking offsets)
        const allDetections: PiiDetectionResult[] = []; // Track all detections for final audit log

        // Helper to send SSE event
        const sendEvent = (
            controller: ReadableStreamDefaultController<Uint8Array>,
            encoder: TextEncoder,
            event: unknown,
        ) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        // Async PII detection for retroactive masking (non-blocking)
        const runRetroactiveDetection = async (
            text: string,
            baseOffset: number,
            controller: ReadableStreamDefaultController<Uint8Array>,
            encoder: TextEncoder,
        ) => {
            if (!piiEnabled || !text.trim()) {
                return;
            }

            try {
                const piiService = getPiiDetectionService();
                const detectionResult = await piiService.detectPii(text, {
                    userId,
                    conversationId,
                });

                if (detectionResult.success && detectionResult.detections.length > 0) {
                    // Emit pii_mask events for retroactive masking
                    for (const detection of detectionResult.detections) {
                        sendEvent(controller, encoder, {
                            type: 'pii_mask',
                            startOffset: baseOffset + detection.startOffset,
                            endOffset: baseOffset + detection.endOffset,
                            piiType: detection.piiType,
                            originalLength: detection.endOffset - detection.startOffset,
                        });
                    }

                    // Log detection for audit (masked representation only)
                    const maskedText = maskPiiInText(text, detectionResult.detections);
                    logger.info(
                        {
                            conversationId,
                            userId,
                            detectionCount: detectionResult.detections.length,
                            piiTypes: detectionResult.detections.map((d) => d.piiType),
                            maskedText,
                        },
                        'PII detected retroactively in stream',
                    );
                }
            } catch (error) {
                // Never crash stream on detection failures
                logger.error(
                    {
                        error,
                        conversationId,
                        userId,
                    },
                    'Retroactive PII detection error, continuing stream',
                );
            }
        };

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    // Stream AI response
                    for await (const chunk of aiClient.createChatCompletionStream(messages)) {
                        if (chunk.choices[0]?.delta?.content) {
                            const content = chunk.choices[0].delta.content;
                            assistantContent += content;
                            chunkCount++;

                            if (piiEnabled) {
                                // Accumulate content in buffer for batch detection
                                contentBuffer += content;

                                // Run PII detection after every N chunks
                                if (chunkCount % piiConfig.chunkBatchSize === 0 && contentBuffer.length > 0) {
                                    try {
                                        const piiService = getPiiDetectionService();
                                        const detectionResult = await piiService
                                            .detectPii(contentBuffer, { userId, conversationId })
                                            .catch((error) => {
                                                logger.error({ error }, 'PII detection failed in batch');
                                                return { detections: [], success: false };
                                            });

                                        if (detectionResult.success && detectionResult.detections.length > 0) {
                                            // Adjust detection offsets to be absolute (relative to full message)
                                            const baseOffset = sentOriginalLength;
                                            const adjustedDetections: PiiDetectionResult[] =
                                                detectionResult.detections.map((detection) => ({
                                                    ...detection,
                                                    startOffset: baseOffset + detection.startOffset,
                                                    endOffset: baseOffset + detection.endOffset,
                                                }));
                                            allDetections.push(...adjustedDetections);

                                            // DEBUG: Log detection details
                                            logger.debug({
                                                baseOffset,
                                                sentOriginalLength,
                                                bufferLength: contentBuffer.length,
                                                detections: adjustedDetections.map(d => ({
                                                    type: d.piiType,
                                                    start: d.startOffset,
                                                    end: d.endOffset,
                                                    text: contentBuffer.slice(d.startOffset - baseOffset, d.endOffset - baseOffset)
                                                }))
                                            }, 'PII batch detection offsets');

                                            // Send original buffer (frontend will apply masking via spoiler effect)
                                            // PII is only masked when saving to database, not during streaming
                                            sendEvent(controller, encoder, {
                                                type: 'content',
                                                content: contentBuffer,
                                            });

                                            // Emit pii_mask events for detections in this batch
                                            for (const detection of adjustedDetections) {
                                                sendEvent(controller, encoder, {
                                                    type: 'pii_mask',
                                                    startOffset: detection.startOffset,
                                                    endOffset: detection.endOffset,
                                                    piiType: detection.piiType,
                                                    originalLength: detection.endOffset - detection.startOffset,
                                                });
                                            }

                                            // Update sent length (using original buffer length)
                                            sentOriginalLength += contentBuffer.length;

                                            // Log detection for audit (mask PII for logs only, never log original)
                                            const maskedForLog = maskPiiInText(
                                                contentBuffer,
                                                detectionResult.detections,
                                            );
                                            logger.info(
                                                {
                                                    conversationId,
                                                    userId,
                                                    detectionCount: detectionResult.detections.length,
                                                    piiTypes: detectionResult.detections.map((d) => d.piiType),
                                                    maskedText: maskedForLog,
                                                },
                                                'PII detected in stream batch',
                                            );
                                        } else {
                                            // No PII detected, send buffer as-is
                                            sendEvent(controller, encoder, {
                                                type: 'content',
                                                content: contentBuffer,
                                            });
                                            sentOriginalLength += contentBuffer.length;
                                        }

                                        // Trigger retroactive detection on already-sent original content (non-blocking)
                                        // This checks for PII that might have been missed in earlier batches
                                        if (sentOriginalLength > 0 && assistantContent.length >= sentOriginalLength) {
                                            const sentOriginalContent = assistantContent.slice(0, sentOriginalLength);
                                            runRetroactiveDetection(sentOriginalContent, 0, controller, encoder).catch(
                                                (error) => {
                                                    logger.error(
                                                        { error },
                                                        'Background retroactive PII detection failed',
                                                    );
                                                },
                                            );
                                        }

                                        // Reset buffer
                                        contentBuffer = '';
                                    } catch (error) {
                                        // Never crash stream on detection failures
                                        logger.error({ error }, 'PII detection error, sending content unmasked');
                                        sendEvent(controller, encoder, {
                                            type: 'content',
                                            content: contentBuffer,
                                        });
                                        sentOriginalLength += contentBuffer.length;
                                        contentBuffer = '';
                                    }
                                }
                                // If not a batch boundary, content stays in buffer (will be sent on next batch or at end)
                            } else {
                                // PII detection disabled, send content immediately
                                sendEvent(controller, encoder, {
                                    type: 'content',
                                    content,
                                });
                                sentOriginalLength += content.length;
                            }
                        }

                        // Get token usage from final chunk (OpenRouter sends in last chunk)
                        if (chunk.usage) {
                            promptTokens = chunk.usage.prompt_tokens ?? 0;
                            completionTokens = chunk.usage.completion_tokens ?? 0;
                        }
                    }

                    // Handle remaining content in buffer after stream ends
                    if (contentBuffer.length > 0) {
                        if (piiEnabled) {
                            try {
                                const piiService = getPiiDetectionService();
                                const detectionResult = await piiService
                                    .detectPii(contentBuffer, { userId, conversationId })
                                    .catch(() => ({
                                        detections: [],
                                        success: false,
                                    }));

                                if (detectionResult.success && detectionResult.detections.length > 0) {
                                    // Adjust detection offsets to be absolute (relative to full message)
                                    const baseOffset = sentOriginalLength;
                                    const adjustedDetections: PiiDetectionResult[] = detectionResult.detections.map(
                                        (detection) => ({
                                            ...detection,
                                            startOffset: baseOffset + detection.startOffset,
                                            endOffset: baseOffset + detection.endOffset,
                                        }),
                                    );
                                    allDetections.push(...adjustedDetections);

                                    // Send original buffer (frontend will apply masking via spoiler effect)
                                    // PII is only masked when saving to database, not during streaming
                                    sendEvent(controller, encoder, {
                                        type: 'content',
                                        content: contentBuffer,
                                    });

                                    // Emit final pii_mask events
                                    for (const detection of adjustedDetections) {
                                        sendEvent(controller, encoder, {
                                            type: 'pii_mask',
                                            startOffset: detection.startOffset,
                                            endOffset: detection.endOffset,
                                            piiType: detection.piiType,
                                            originalLength: detection.endOffset - detection.startOffset,
                                        });
                                    }

                                    sentOriginalLength += contentBuffer.length;

                                    // Log final detection (mask PII for logs only, never log original)
                                    const maskedForLog = maskPiiInText(contentBuffer, detectionResult.detections);
                                    logger.info(
                                        {
                                            conversationId,
                                            userId,
                                            detectionCount: detectionResult.detections.length,
                                            piiTypes: detectionResult.detections.map((d) => d.piiType),
                                            maskedText: maskedForLog,
                                        },
                                        'Final PII detection in stream',
                                    );
                                } else {
                                    sendEvent(controller, encoder, {
                                        type: 'content',
                                        content: contentBuffer,
                                    });
                                    sentOriginalLength += contentBuffer.length;
                                }
                            } catch (error) {
                                logger.error({ error }, 'Final PII detection error, sending content unmasked');
                                sendEvent(controller, encoder, {
                                    type: 'content',
                                    content: contentBuffer,
                                });
                                sentOriginalLength += contentBuffer.length;
                            }
                        } else {
                            sendEvent(controller, encoder, {
                                type: 'content',
                                content: contentBuffer,
                            });
                            sentOriginalLength += contentBuffer.length;
                        }
                    }

                    // Store original content with PII - UI will apply spoiler effect using PiiDetection metadata
                    const finalContent = assistantContent;

                    // If no token usage in stream, estimate per message type
                    if (promptTokens === 0 && completionTokens === 0) {
                        promptTokens = aiClient.estimateTokenCount(messages);
                        completionTokens = aiClient.estimateTokenCount([
                            { role: 'assistant', content: assistantContent },
                        ]);
                    }
                    const totalTokens = promptTokens + completionTokens;

                    // Save assistant message (reply tokens)
                    const assistantMessage = await prisma.message.create({
                        data: {
                            conversationId,
                            role: 'assistant',
                            content: finalContent,
                            tokenCount: completionTokens,
                        },
                    });

                    assistantMessageId = assistantMessage.id;

                    // Persist PII detections to database (non-blocking, failures don't break stream)
                    // allDetections already have absolute offsets relative to full message content
                    if (piiEnabled && allDetections.length > 0 && assistantMessage.id) {
                        persistPiiDetections(assistantMessage.id, allDetections).catch((error) => {
                            logger.error(
                                { error, messageId: assistantMessage.id },
                                'Background PII persistence failed',
                            );
                        });
                    }

                    // Update user message with input (prompt) token count
                    await prisma.message.update({
                        where: { id: userMessage.id },
                        data: { tokenCount: promptTokens },
                    });

                    // Track token usage (total for quota)
                    await trackTokenUsage(userId, totalTokens);
                    await updateConversationTokens(conversationId, totalTokens);

                    // Send completion event
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({
                                type: 'done',
                                userMessageId: userMessage.id,
                                assistantMessageId: assistantMessage.id,
                                totalTokens,
                            })}\n\n`,
                        ),
                    );

                    logger.info(
                        {
                            conversationId,
                            userId,
                            promptTokens,
                            completionTokens,
                            totalTokens,
                        },
                        'Streaming response completed',
                    );

                    controller.close();
                } catch (error) {
                    logger.error(
                        {
                            error,
                            conversationId,
                            userId,
                        },
                        'Streaming error',
                    );

                    // Send error event
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({
                                type: 'error',
                                error: 'Failed to get AI response',
                            })}\n\n`,
                        ),
                    );

                    // Clean up user message if no assistant message was created
                    if (!assistantMessageId) {
                        await prisma.message.delete({ where: { id: userMessage.id } }).catch(() => {
                            // Ignore cleanup errors
                        });
                    }

                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        logger.error({ error }, 'Streaming request failed');
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
