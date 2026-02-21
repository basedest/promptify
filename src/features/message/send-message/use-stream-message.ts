'use client';

import { useState, useCallback } from 'react';

type StreamEvent =
    | { type: 'content'; content: string }
    | { type: 'done'; userMessageId: string; assistantMessageId: string; totalTokens: number }
    | { type: 'error'; error: string }
    | { type: 'pii_mask'; startOffset: number; endOffset: number; piiType: string; originalLength: number };

export type PiiMaskRegion = {
    startOffset: number;
    endOffset: number;
    piiType: string;
    originalLength: number;
};

/**
 * Merge a new PII mask region into existing regions (out-of-order safe).
 * Sorts by startOffset and merges overlapping/adjacent intervals so the list
 * stays canonical and avoids double-masking or flicker (FR-4, FR-6).
 */
function mergePiiMaskRegions(existing: PiiMaskRegion[], newRegion: PiiMaskRegion): PiiMaskRegion[] {
    const combined = [...existing, newRegion].sort((a, b) => a.startOffset - b.startOffset);
    if (combined.length === 0) return [];
    const merged: PiiMaskRegion[] = [];
    let current = { ...combined[0] };

    for (let i = 1; i < combined.length; i++) {
        const next = combined[i];
        if (next.startOffset <= current.endOffset) {
            // Overlapping or adjacent: extend current
            current.endOffset = Math.max(current.endOffset, next.endOffset);
            current.originalLength = current.endOffset - current.startOffset;
        } else {
            merged.push(current);
            current = { ...next };
        }
    }
    merged.push(current);
    return merged;
}

type StreamState = {
    isStreaming: boolean;
    streamingContent: string;
    error: string | null;
    piiMaskRegions: PiiMaskRegion[];
};

type SendMessageOptions = {
    conversationId: string;
    content: string;
    onChunk?: (content: string) => void;
    onComplete?: (data: { userMessageId: string; assistantMessageId: string; totalTokens: number }) => void;
    onError?: (error: string) => void;
    onPiiMask?: (region: PiiMaskRegion) => void;
};

/**
 * Validate pii_mask event fields
 * Invalid events are silently ignored (graceful degradation, NFR2)
 */
function isValidPiiMaskEvent(event: unknown): event is {
    type: 'pii_mask';
    startOffset: number;
    endOffset: number;
    piiType: string;
    originalLength: number;
} {
    if (!event || typeof event !== 'object') return false;
    const e = event as Record<string, unknown>;

    return (
        e.type === 'pii_mask' &&
        typeof e.startOffset === 'number' &&
        typeof e.endOffset === 'number' &&
        typeof e.piiType === 'string' &&
        typeof e.originalLength === 'number' &&
        Number.isInteger(e.startOffset) &&
        Number.isInteger(e.endOffset) &&
        Number.isInteger(e.originalLength) &&
        e.startOffset >= 0 &&
        e.endOffset > e.startOffset &&
        e.originalLength > 0 &&
        e.piiType.length > 0
    );
}

export function useStreamMessage() {
    const [state, setState] = useState<StreamState>({
        isStreaming: false,
        streamingContent: '',
        error: null,
        piiMaskRegions: [],
    });

    const sendMessage = useCallback(
        async ({ conversationId, content, onChunk, onComplete, onError, onPiiMask }: SendMessageOptions) => {
            setState({
                isStreaming: true,
                streamingContent: '',
                error: null,
                piiMaskRegions: [],
            });

            try {
                const response = await fetch('/api/chat/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ conversationId, content }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to send message' }));
                    const errorMessage = errorData.error || 'Failed to send message';
                    setState({
                        isStreaming: false,
                        streamingContent: '',
                        error: errorMessage,
                        piiMaskRegions: [],
                    });
                    onError?.(errorMessage);
                    return;
                }

                if (!response.body) {
                    throw new Error('No response body');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let fullContent = '';

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });

                    // Process complete SSE messages (separated by \n\n)
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || ''; // Keep incomplete message in buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            try {
                                const event: StreamEvent = JSON.parse(data);

                                if (event.type === 'content') {
                                    fullContent += event.content;
                                    setState((prev) => ({
                                        ...prev,
                                        streamingContent: fullContent,
                                    }));
                                    onChunk?.(event.content);
                                } else if (event.type === 'done') {
                                    await Promise.resolve(onComplete?.(event));
                                    setState({
                                        isStreaming: false,
                                        streamingContent: '',
                                        error: null,
                                        piiMaskRegions: [],
                                    });
                                } else if (event.type === 'error') {
                                    setState({
                                        isStreaming: false,
                                        streamingContent: '',
                                        error: event.error,
                                        piiMaskRegions: [],
                                    });
                                    onError?.(event.error);
                                } else if (event.type === 'pii_mask') {
                                    // Validate pii_mask event fields (NFR2: invalid metadata safely ignored)
                                    if (!isValidPiiMaskEvent(event)) {
                                        // Silently ignore invalid pii_mask events (graceful degradation)
                                        continue;
                                    }

                                    // Merge region into list (out-of-order safe; overlapping regions merged)
                                    const region: PiiMaskRegion = {
                                        startOffset: event.startOffset,
                                        endOffset: event.endOffset,
                                        piiType: event.piiType,
                                        originalLength: event.originalLength,
                                    };
                                    setState((prev) => ({
                                        ...prev,
                                        piiMaskRegions: mergePiiMaskRegions(prev.piiMaskRegions, region),
                                    }));
                                    onPiiMask?.(region);
                                }
                            } catch {
                                // Silently ignore parse errors (NFR2: graceful degradation)
                                // Stream continues without masking on error
                            }
                        }
                    }
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
                setState({
                    isStreaming: false,
                    streamingContent: '',
                    error: errorMessage,
                    piiMaskRegions: [],
                });
                onError?.(errorMessage);
            }
        },
        [],
    );

    return {
        ...state,
        sendMessage,
    };
}
