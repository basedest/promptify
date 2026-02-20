import type { ChatMessage } from 'src/shared/backend/openrouter';

export interface ConversationInfo {
    userId: string;
    messageCount: number;
}

export interface CreateMessageInput {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokenCount?: number;
}

export interface CreatedMessage {
    id: string;
    createdAt: Date;
}

export interface IMessageRepository {
    findConversation(conversationId: string): Promise<ConversationInfo | null>;

    findContextMessages(conversationId: string, limit: number): Promise<ChatMessage[]>;

    createMessage(input: CreateMessageInput): Promise<CreatedMessage>;

    updateMessageTokenCount(messageId: string, tokenCount: number): Promise<void>;

    deleteMessage(messageId: string): Promise<void>;
}
