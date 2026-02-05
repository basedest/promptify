'use client';

import { MessageCard, TypingIndicator } from 'src/entities/message/ui';
import { EmptyState } from './empty-state';

type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokenCount: number;
    createdAt: Date;
};

type MessageListProps = {
    messages: Message[];
    isLoading?: boolean;
    isStreaming?: boolean;
    streamingContent?: string;
};

export function MessageList({ messages, isLoading, isStreaming, streamingContent }: MessageListProps) {
    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground text-sm">Loading messages...</p>
            </div>
        );
    }

    if (messages.length === 0 && !isStreaming) {
        return (
            <div className="flex-1">
                <EmptyState />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((message) => (
                    <MessageCard
                        key={message.id}
                        role={message.role}
                        content={message.content}
                        timestamp={message.createdAt}
                        tokenCount={message.tokenCount}
                    />
                ))}
                {isStreaming && <TypingIndicator content={streamingContent} />}
            </div>
        </div>
    );
}
