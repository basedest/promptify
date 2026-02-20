import type { ChatMessage, ChatCompletionChunk, ChatCompletionResponse } from 'src/shared/backend/openrouter';

export interface IChatClient {
    createChatCompletionStream(messages: ChatMessage[]): AsyncIterable<ChatCompletionChunk>;
    createChatCompletion(
        messages: ChatMessage[],
        options?: {
            model?: string;
            temperature?: number;
            max_tokens?: number;
            signal?: AbortSignal;
        },
    ): Promise<ChatCompletionResponse>;
    estimateTokenCount(messages: ChatMessage[]): number;
}
