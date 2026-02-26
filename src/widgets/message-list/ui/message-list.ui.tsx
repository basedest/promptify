'use client';

import { MessageCard, TypingIndicator } from 'src/entities/message/ui';
import type { PiiMaskRegion } from 'src/shared/ui/pii-mask';
import { Skeleton } from 'src/shared/ui/skeleton';

type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokenCount: number;
    createdAt: Date;
    piiMaskRegions?: PiiMaskRegion[];
};

type MessageListProps = {
    messages: Message[];
    isLoading?: boolean;
    isStreaming?: boolean;
    streamingContent?: string;
    streamingPiiMaskRegions?: PiiMaskRegion[];
};

export function MessageList({
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    streamingPiiMaskRegions = [],
}: MessageListProps) {
    if (isLoading) {
        return (
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl space-y-4">
                    <div className="flex justify-start py-3">
                        <div className="w-[75%] space-y-2 p-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-3/5" />
                        </div>
                    </div>
                    <div className="flex justify-end py-3">
                        <Skeleton className="h-10 w-2/5 rounded-2xl" />
                    </div>
                    <div className="flex justify-start py-3">
                        <div className="w-[75%] space-y-2 p-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (messages.length === 0 && !isStreaming) {
        return <div className="flex-1" />;
    }

    return (
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((message) => (
                    <MessageCard
                        key={message.id}
                        role={message.role}
                        content={message.content}
                        timestamp={message.createdAt}
                        tokenCount={message.tokenCount}
                        piiMaskRegions={message.piiMaskRegions}
                        messageId={message.id}
                    />
                ))}
                {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant') && (
                    <TypingIndicator content={streamingContent || ''} piiMaskRegions={streamingPiiMaskRegions} />
                )}
            </div>
        </div>
    );
}
