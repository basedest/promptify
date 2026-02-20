import 'server-only';
import { type PiiType, PII_TYPES } from 'src/shared/config/env/server';
import { logger } from 'src/shared/backend/logger';
import type { IChatClient } from 'src/shared/backend/ports';
import type { ChatMessage } from 'src/shared/backend/openrouter';
import { prisma } from 'src/shared/backend/prisma';
import { buildDetectionPrompt, buildSystemPrompt, PII_TYPE_TO_PLACEHOLDER } from './prompts';
import type { PiiDetectionResponse, PiiDetectionResult } from './types';
import { PiiMasker } from './mask';
import { PiiDetectionRepository } from './persistence';
import { PiiDetectionCostTracker } from './cost-tracking';

export type PiiDetectionConfig = {
    model: string;
    detectionTimeoutMs: number;
    piiTypes: PiiType[];
};

export type PiiDetectionServiceDeps = {
    masker?: PiiMasker;
    repository?: PiiDetectionRepository;
    costTracker?: PiiDetectionCostTracker;
};

/**
 * PII Detection Service
 * Uses configured model via OpenRouter to detect PII in text
 */
export class PiiDetectionService {
    private readonly model: string;
    private readonly timeoutMs: number;
    private readonly enabledPiiTypes: PiiType[];
    private readonly masker: PiiMasker;
    private readonly repository: PiiDetectionRepository;
    private readonly costTracker: PiiDetectionCostTracker;

    constructor(
        private readonly config: PiiDetectionConfig,
        private readonly chatClient: IChatClient,
        deps?: PiiDetectionServiceDeps,
    ) {
        this.model = config.model;
        this.timeoutMs = config.detectionTimeoutMs;
        this.enabledPiiTypes = config.piiTypes;
        this.masker = deps?.masker ?? new PiiMasker();
        this.repository = deps?.repository ?? new PiiDetectionRepository(prisma);
        this.costTracker = deps?.costTracker ?? new PiiDetectionCostTracker(prisma);
    }

    maskPiiInText(text: string, detections: PiiDetectionResult[]): string {
        return this.masker.mask(text, detections);
    }

    async persistDetections(messageId: string, detections: PiiDetectionResult[]): Promise<void> {
        return this.repository.persist(messageId, detections);
    }

    /**
     * Detect PII in accumulated text
     * @param text - Accumulated text to scan for PII
     * @param options - Optional tracking parameters (userId, conversationId)
     * @returns Detection results with offsets and types
     */
    async detectPii(
        text: string,
        options?: { userId?: string; conversationId?: string },
    ): Promise<PiiDetectionResponse> {
        if (!text.trim()) {
            return { detections: [], success: true };
        }

        const startTime = Date.now();
        let tokens = 0;

        try {
            const detections = await this.callDetectionApi(text, (usage) => {
                tokens = usage?.total_tokens ?? 0;
            });
            const success = true;
            const latencyMs = Date.now() - startTime;

            // Track cost (non-blocking)
            this.costTracker
                .track({
                    userId: options?.userId,
                    conversationId: options?.conversationId,
                    tokens,
                    latencyMs,
                    success,
                })
                .catch((error) => {
                    logger.error({ error }, 'Failed to track PII detection cost');
                });

            // Log all detection API calls
            logger.info(
                {
                    userId: options?.userId,
                    conversationId: options?.conversationId,
                    textLength: text.length,
                    tokens,
                    latencyMs,
                    detectionCount: detections.length,
                },
                'PII detection API call',
            );

            return {
                detections,
                success: true,
            };
        } catch (error) {
            const success = false;
            const latencyMs = Date.now() - startTime;

            // Track cost for failed request (non-blocking)
            this.costTracker
                .track({
                    userId: options?.userId,
                    conversationId: options?.conversationId,
                    tokens,
                    latencyMs,
                    success,
                })
                .catch((trackError) => {
                    logger.error({ error: trackError }, 'Failed to track PII detection cost');
                });

            // Log all detection API calls (including failures)
            logger.error(
                {
                    error: error instanceof Error ? error.message : String(error),
                    userId: options?.userId,
                    conversationId: options?.conversationId,
                    textLength: text.length,
                    tokens,
                    latencyMs,
                },
                'PII detection API call failed',
            );

            return {
                detections: [],
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Call OpenRouter API for PII detection with timeout
     * @param onUsage - Callback to receive token usage information
     */
    private async callDetectionApi(
        text: string,
        onUsage?: (usage: { total_tokens: number } | undefined) => void,
    ): Promise<PiiDetectionResult[]> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const messages: ChatMessage[] = [
                {
                    role: 'system',
                    content: buildSystemPrompt(this.enabledPiiTypes),
                },
                {
                    role: 'user',
                    content: buildDetectionPrompt(text, this.enabledPiiTypes),
                },
            ];

            const response = await this.chatClient.createChatCompletion(messages, {
                model: this.model,
                temperature: 0,
                max_tokens: 2000,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Report usage if callback provided
            onUsage?.(response.usage);

            const content = response.choices[0]?.message?.content;

            if (!content) {
                logger.warn('PII detection returned empty content');
                return [];
            }

            return this.parseDetectionResponse(text, content);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`PII detection timeout after ${this.timeoutMs}ms`);
            }
            throw error;
        }
    }

    /**
     * Parse LLM response into structured detection results.
     * Expects semantic-only output (piiType, value, confidence). Offsets are derived by finding value in text; placeholder from piiType.
     */
    private parseDetectionResponse(originalText: string, llmResponse: string): PiiDetectionResult[] {
        try {
            let jsonStr = llmResponse.trim();
            const jsonMatch = jsonStr.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            const parsed = JSON.parse(jsonStr) as unknown;

            if (!Array.isArray(parsed)) {
                logger.warn({ response: llmResponse }, 'PII detection returned non-array response');
                return [];
            }

            const rawItems: Array<{ piiType: PiiType; value: string; confidence: number }> = [];

            for (const item of parsed) {
                if (typeof item !== 'object' || item === null || !('piiType' in item) || !('value' in item)) {
                    continue;
                }

                const piiType = String(item.piiType).toLowerCase() as PiiType;
                if (!PII_TYPES.includes(piiType)) {
                    logger.warn({ piiType }, 'Invalid PII type detected, skipping');
                    continue;
                }

                const value = typeof item.value === 'string' ? item.value.trim() : String(item.value ?? '').trim();
                if (!value) {
                    logger.warn('PII detection item with empty value, skipping');
                    continue;
                }

                let confidence = typeof item.confidence === 'number' ? item.confidence : undefined;
                if (confidence === undefined || Number.isNaN(confidence)) {
                    logger.debug(
                        { piiType, value: value.slice(0, 20) },
                        'PII detection missing confidence, defaulting to 0.5',
                    );
                    confidence = 0.5;
                }
                confidence = Math.max(0, Math.min(1, confidence));

                rawItems.push({ piiType, value, confidence });
            }

            // Resolve offsets by finding each value in text (non-overlapping, first unused occurrence)
            const usedRanges: Array<[number, number]> = [];
            const results: PiiDetectionResult[] = [];

            for (const { piiType, value, confidence } of rawItems) {
                const span = this.findNonOverlappingOccurrence(originalText, value, usedRanges);
                if (!span) {
                    logger.warn(
                        { value: value.slice(0, 30), piiType },
                        'PII value not found in text or overlaps existing, skipping',
                    );
                    continue;
                }

                const [startOffset, endOffset] = span;
                usedRanges.push([startOffset, endOffset]);

                results.push({
                    piiType,
                    startOffset,
                    endOffset,
                    placeholder: PII_TYPE_TO_PLACEHOLDER[piiType],
                    confidence,
                });
            }

            results.sort((a, b) => a.startOffset - b.startOffset);

            logger.debug({ count: results.length, types: results.map((d) => d.piiType) }, 'PII detection completed');

            return results;
        } catch (error) {
            logger.error({ error, response: llmResponse }, 'Failed to parse PII detection response');
            return [];
        }
    }

    /**
     * Find first occurrence of value in text that does not overlap any of the used ranges.
     */
    private findNonOverlappingOccurrence(
        text: string,
        value: string,
        usedRanges: Array<[number, number]>,
    ): [number, number] | null {
        let fromIndex = 0;
        const len = value.length;

        while (fromIndex <= text.length - len) {
            const idx = text.indexOf(value, fromIndex);
            if (idx === -1) break;

            const end = idx + len;
            const overlaps = usedRanges.some(([s, e]) => idx < e && end > s);
            if (!overlaps) {
                return [idx, end];
            }
            fromIndex = idx + 1;
        }
        return null;
    }
}
