import 'server-only';
import { logger } from 'src/shared/backend/logger';

export type AiConfig = {
    openRouterApiKey: string;
    model: string;
    appUrl: string;
    appTitle: string;
};

export type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

export type ChatCompletionChunk = {
    id: string;
    choices: Array<{
        delta: {
            content?: string;
            role?: string;
        };
        finish_reason: string | null;
        index: number;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
};

export type OpenRouterError = {
    error: {
        message: string;
        type: string;
        code?: string;
    };
};

export type ChatCompletionResponse = {
    id: string;
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
};

export class OpenRouterClient {
    private readonly apiKey: string;
    private readonly model: string;
    private readonly appUrl: string;
    private readonly appTitle: string;
    private readonly baseUrl = 'https://openrouter.ai/api/v1';

    constructor(config: AiConfig) {
        this.apiKey = config.openRouterApiKey;
        this.model = config.model;
        this.appUrl = config.appUrl;
        this.appTitle = config.appTitle;
    }

    /**
     * Create a streaming chat completion
     * @param messages - Array of chat messages
     * @returns AsyncIterable stream of completion chunks
     */
    async *createChatCompletionStream(messages: ChatMessage[]): AsyncIterable<ChatCompletionChunk> {
        logger.debug({ model: this.model, messageCount: messages.length }, 'Starting OpenRouter stream');

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
                'HTTP-Referer': this.appUrl,
                'X-Title': this.appTitle,
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as OpenRouterError;
            const errorMessage = errorData.error?.message || response.statusText;
            logger.error({ status: response.status, error: errorMessage }, 'OpenRouter API request failed');
            throw new Error(`OpenRouter API error: ${errorMessage}`);
        }

        if (!response.body) {
            logger.error('OpenRouter response has no body');
            throw new Error('OpenRouter response has no body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    logger.debug('OpenRouter stream completed');
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') {
                        continue;
                    }

                    if (trimmed.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(trimmed.slice(6)) as ChatCompletionChunk;
                            yield json;
                        } catch (parseError) {
                            logger.warn({ line: trimmed, parseError }, 'Failed to parse SSE chunk');
                        }
                    }
                }
            }
        } catch (error) {
            logger.error({ error }, 'Error reading OpenRouter stream');
            throw error;
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Create a non-streaming chat completion
     * @param messages - Array of chat messages
     * @param options - Optional overrides (model, temperature, max_tokens)
     * @returns Completion response
     */
    async createChatCompletion(
        messages: ChatMessage[],
        options?: {
            model?: string;
            temperature?: number;
            max_tokens?: number;
            signal?: AbortSignal;
        },
    ): Promise<ChatCompletionResponse> {
        const model = options?.model ?? this.model;
        logger.debug({ model, messageCount: messages.length }, 'Starting OpenRouter completion');

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
                'HTTP-Referer': this.appUrl,
                'X-Title': this.appTitle,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: options?.temperature ?? 0,
                max_tokens: options?.max_tokens ?? 2000,
            }),
            signal: options?.signal,
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as OpenRouterError;
            const errorMessage = errorData.error?.message || response.statusText;
            logger.error({ status: response.status, error: errorMessage }, 'OpenRouter API request failed');
            throw new Error(`OpenRouter API error: ${errorMessage}`);
        }

        const data = (await response.json()) as ChatCompletionResponse;
        logger.debug({ model, usage: data.usage }, 'OpenRouter completion completed');
        return data;
    }

    /**
     * Calculate approximate token count for messages
     * Simple estimation: ~4 characters per token
     */
    estimateTokenCount(messages: ChatMessage[]): number {
        const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
        return Math.ceil(totalChars / 4);
    }
}
