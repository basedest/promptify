'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from 'src/shared/api/trpc/client';
import { getClientConfig } from 'src/shared/config/env/client';
import { ConversationSidebar, MessageList, MessageInput, ErrorBanner } from 'src/widgets/chat';
import { useStreamMessage } from 'src/features/message/send-message/use-stream-message';

type ErrorType = 'network' | 'quota' | 'rateLimit' | 'session' | null;

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
    }
    return 'network';
}

export function ChatView() {
    const t = useTranslations('chat');
    const utils = trpc.useUtils();
    const clientConfig = getClientConfig();
    const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
    const [messageInput, setMessageInput] = useState('');
    const [isDeletingId, setIsDeletingId] = useState<string | undefined>();
    const [streamError, setStreamError] = useState<string | null>(null);

    const { data: conversations, isLoading: loadingConversations } = trpc.conversation.list.useQuery();

    const { data: messages, isLoading: loadingMessages } = trpc.message.list.useQuery(
        { conversationId: selectedConversationId! },
        { enabled: !!selectedConversationId },
    );

    const { isStreaming, streamingContent, sendMessage } = useStreamMessage();

    const createConversationMutation = trpc.conversation.create.useMutation({
        onSuccess: (conversation) => {
            setSelectedConversationId(conversation.id);
            utils.conversation.list.invalidate();
        },
    });

    const deleteConversationMutation = trpc.conversation.delete.useMutation({
        onSuccess: (_, variables) => {
            // If we deleted the selected conversation, clear selection
            if (selectedConversationId === variables.id) {
                setSelectedConversationId(undefined);
            }
            setIsDeletingId(undefined);
            // Refresh conversations list
            utils.conversation.list.invalidate();
        },
        onError: () => {
            setIsDeletingId(undefined);
        },
    });

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
        if (createConversationMutation.error) {
            return mapErrorType(createConversationMutation.error);
        }
        if (deleteConversationMutation.error) {
            return mapErrorType(deleteConversationMutation.error);
        }
        return null;
    }, [streamError, createConversationMutation.error, deleteConversationMutation.error]);

    const handleNewChat = () => {
        setSelectedConversationId(undefined);
        setMessageInput('');
    };

    const handleDeleteConversation = (conversationId: string) => {
        setIsDeletingId(conversationId);
        deleteConversationMutation.mutate({ id: conversationId });
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || isStreaming || createConversationMutation.isPending) return;

        const content = messageInput.trim();
        setStreamError(null);

        // If no conversation is selected, create one first
        if (!selectedConversationId) {
            // Generate title from first message (truncate to maxConversationTitleLength)
            const title = content.slice(0, clientConfig.chat.maxConversationTitleLength);
            createConversationMutation.mutate(
                { title },
                {
                    onSuccess: async (conversation) => {
                        // Clear input and send message to the newly created conversation
                        setMessageInput('');
                        await sendMessage({
                            conversationId: conversation.id,
                            content,
                            onComplete: () => {
                                // Refresh messages and conversations
                                utils.message.list.invalidate({ conversationId: conversation.id });
                                utils.conversation.list.invalidate();
                                utils.tokenTracking.getUsage.invalidate();
                            },
                            onError: (error) => {
                                setStreamError(error);
                            },
                        });
                    },
                },
            );
        } else {
            // Clear input and send message
            setMessageInput('');
            await sendMessage({
                conversationId: selectedConversationId,
                content,
                onComplete: () => {
                    // Refresh messages and conversations
                    utils.message.list.invalidate({ conversationId: selectedConversationId });
                    utils.conversation.list.invalidate();
                    utils.tokenTracking.getUsage.invalidate();
                },
                onError: (error) => {
                    setStreamError(error);
                },
            });
        }
    };

    if (loadingConversations) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-muted-foreground">{t('loading')}</p>
            </div>
        );
    }

    // Show welcome message when no conversation is selected
    const displayMessages = selectedConversationId
        ? (messages ?? []).map((msg) => ({
              ...msg,
              role: msg.role as 'user' | 'assistant' | 'system',
              createdAt: new Date(msg.createdAt),
          }))
        : [
              {
                  id: 'placeholder',
                  role: 'assistant' as const,
                  content: t('welcomeMessage'),
                  tokenCount: 0,
                  createdAt: new Date(),
              },
          ];

    return (
        <div className="flex h-screen">
            <ConversationSidebar
                conversations={conversations ?? []}
                selectedConversationId={selectedConversationId}
                onConversationSelect={setSelectedConversationId}
                onNewChat={handleNewChat}
                onDelete={handleDeleteConversation}
                isDeletingId={isDeletingId}
            />

            <div className="flex flex-1 flex-col">
                <ErrorBanner
                    error={error}
                    onDismiss={() => {
                        setStreamError(null);
                        createConversationMutation.reset();
                        deleteConversationMutation.reset();
                    }}
                />
                <MessageList
                    messages={displayMessages}
                    isLoading={loadingMessages}
                    isStreaming={isStreaming}
                    streamingContent={streamingContent}
                />
                <MessageInput
                    value={messageInput}
                    onChange={setMessageInput}
                    onSubmit={handleSendMessage}
                    disabled={false}
                    isSubmitting={isStreaming || createConversationMutation.isPending}
                />
            </div>
        </div>
    );
}
