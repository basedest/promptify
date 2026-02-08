'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from 'src/shared/api/trpc/client';
import { getClientConfig } from 'src/shared/config/env/client';
import { MessageList } from 'src/widgets/message-list';
import { MessageInput } from 'src/widgets/message-input';
import { ErrorBanner } from 'src/widgets/error-banner';
import { useStreamMessage } from 'src/features/message/send-message/use-stream-message';
import { AppSidebar } from 'src/widgets/sidebar';
import { useChats } from 'src/entities/chat';

type ErrorType = 'network' | 'quota' | 'rateLimit' | 'session' | 'conversationLimit' | null;
type DisplayMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokenCount: number;
    createdAt: Date;
};
type MessageListItem = {
    id: string;
    role: string;
    content: string;
    tokenCount: number;
    createdAt: Date | string;
};

/**
 * Map tRPC error code to ErrorType
 */
function mapErrorType(error: unknown): ErrorType {
    if (error && typeof error === 'object' && 'data' in error) {
        const trpcError = error as { data?: { code?: string }; message?: string };
        const code = trpcError.data?.code;
        const message = trpcError.message?.toLowerCase() || '';

        if (code === 'TOO_MANY_REQUESTS') {
            return 'rateLimit';
        }
        if (code === 'FORBIDDEN' && (message.includes('quota') || message.includes('token'))) {
            return 'quota';
        }
        if (code === 'UNAUTHORIZED' || message.includes('session')) {
            return 'session';
        }
        if (code === 'BAD_REQUEST' && message.includes('maximum') && message.includes('conversations')) {
            return 'conversationLimit';
        }
    }
    return 'network';
}

export function ChatView() {
    const t = useTranslations('chat');
    const utils = trpc.useUtils();
    const clientConfig = getClientConfig();
    const [streamError, setStreamError] = useState<string | null>(null);
    const [optimisticMessage, setOptimisticMessage] = useState<DisplayMessage | null>(null);

    const { loadingChats, selectedChatId, messageInput, setMessageInput, createChatMutation, deleteChatMutation } =
        useChats();
    const { data: messages, isLoading: loadingMessages } = trpc.message.list.useQuery(
        { conversationId: selectedChatId! },
        { enabled: !!selectedChatId },
    );

    const { isStreaming, streamingContent, piiMaskRegions, sendMessage } = useStreamMessage();

    const error: ErrorType = useMemo(() => {
        if (streamError) {
            if (streamError.includes('quota') || streamError.includes('token')) {
                return 'quota';
            }
            if (streamError.includes('rate limit')) {
                return 'rateLimit';
            }
            if (streamError.includes('Unauthorized') || streamError.includes('session')) {
                return 'session';
            }
            return 'network';
        }
        if (createChatMutation.error) {
            return mapErrorType(createChatMutation.error);
        }
        if (deleteChatMutation.error) {
            return mapErrorType(deleteChatMutation.error);
        }
        return null;
    }, [streamError, createChatMutation.error, deleteChatMutation.error]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() || isStreaming || createChatMutation.isPending) return;

        const content = messageInput.trim();
        setStreamError(null);

        // Create optimistic message to show immediately
        const tempMessage = {
            id: 'temp-' + Date.now(),
            role: 'user' as const,
            content,
            tokenCount: 0,
            createdAt: new Date(),
        };

        // Clear input and show optimistic message immediately
        setMessageInput('');
        setOptimisticMessage(tempMessage);

        // If no chat is selected, create one first
        if (!selectedChatId) {
            // Generate title from first message (truncate to maxConversationTitleLength)
            const title = content.slice(0, clientConfig.chat.maxConversationTitleLength);
            createChatMutation.mutate(
                { title },
                {
                    onSuccess: async (chat) => {
                        await sendMessage({
                            conversationId: chat.id,
                            content,
                            onComplete: async () => {
                                // Clear optimistic message before refetching to avoid duplicates
                                setOptimisticMessage(null);
                                // Refresh messages
                                await utils.message.list.invalidate({ conversationId: chat.id });
                                await utils.chat.list.invalidate();
                                await utils.tokenTracking.getUsage.invalidate();
                            },
                            onError: (error) => {
                                setStreamError(error);
                                setOptimisticMessage(null);
                            },
                        });
                    },
                    onError: () => {
                        setOptimisticMessage(null);
                    },
                },
            );
        } else {
            await sendMessage({
                conversationId: selectedChatId,
                content,
                onComplete: async () => {
                    // Clear optimistic message before refetching to avoid duplicates
                    setOptimisticMessage(null);
                    // Refresh messages
                    await utils.message.list.invalidate({ conversationId: selectedChatId });
                    await utils.chat.list.invalidate();
                    await utils.tokenTracking.getUsage.invalidate();
                },
                onError: (error) => {
                    setStreamError(error);
                    setOptimisticMessage(null);
                },
            });
        }
    };

    if (loadingChats) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-muted-foreground">{t('loading')}</p>
            </div>
        );
    }

    // Show welcome message when no conversation is selected
    const baseMessages: DisplayMessage[] = selectedChatId
        ? (messages ?? []).map((msg: MessageListItem) => ({
              ...msg,
              role: msg.role as DisplayMessage['role'],
              createdAt: new Date(msg.createdAt),
          }))
        : [
              {
                  id: 'placeholder',
                  role: 'assistant',
                  content: t('welcomeMessage'),
                  tokenCount: 0,
                  createdAt: new Date(),
              },
          ];

    // Add optimistic message if it exists and doesn't duplicate a real message
    const displayMessages = optimisticMessage
        ? // Only show optimistic message if no real message with same content exists
          baseMessages.some((m) => m.content === optimisticMessage.content && m.role === 'user')
            ? baseMessages // Skip optimistic if real message exists
            : [...baseMessages, optimisticMessage]
        : baseMessages;

    return (
        <div className="flex h-screen">
            <AppSidebar />

            <div className="flex flex-1 flex-col">
                <ErrorBanner
                    error={error}
                    onDismiss={() => {
                        setStreamError(null);
                        createChatMutation.reset();
                        deleteChatMutation.reset();
                    }}
                />
                <MessageList
                    messages={displayMessages}
                    isLoading={loadingMessages}
                    isStreaming={isStreaming}
                    streamingContent={streamingContent}
                    streamingPiiMaskRegions={piiMaskRegions}
                />
                <MessageInput
                    value={messageInput}
                    onChange={setMessageInput}
                    onSubmit={handleSendMessage}
                    disabled={false}
                    isSubmitting={isStreaming || createChatMutation.isPending}
                />
            </div>
        </div>
    );
}
