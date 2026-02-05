'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from 'src/shared/api/trpc/client';
import { getClientConfig } from 'src/shared/config/env/client';
import { ConversationSidebar, MessageList, MessageInput, ErrorBanner } from 'src/widgets/chat';

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

    const { data: conversations, isLoading: loadingConversations } = trpc.conversation.list.useQuery();

    const { data: messages, isLoading: loadingMessages } = trpc.message.list.useQuery(
        { conversationId: selectedConversationId! },
        { enabled: !!selectedConversationId },
    );

    const createConversationMutation = trpc.conversation.create.useMutation({
        onSuccess: (conversation) => {
            setSelectedConversationId(conversation.id);
            utils.conversation.list.invalidate();
        },
    });

    const sendMessageMutation = trpc.message.send.useMutation({
        onSuccess: () => {
            setMessageInput('');
            // Invalidate messages query to refetch updated messages
            if (selectedConversationId) {
                utils.message.list.invalidate({ conversationId: selectedConversationId });
            }
            // Invalidate conversations list to update conversation metadata
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
        if (sendMessageMutation.error) {
            return mapErrorType(sendMessageMutation.error);
        }
        if (createConversationMutation.error) {
            return mapErrorType(createConversationMutation.error);
        }
        if (deleteConversationMutation.error) {
            return mapErrorType(deleteConversationMutation.error);
        }
        return null;
    }, [sendMessageMutation.error, createConversationMutation.error, deleteConversationMutation.error]);

    const handleNewChat = () => {
        setSelectedConversationId(undefined);
        setMessageInput('');
    };

    const handleDeleteConversation = (conversationId: string) => {
        setIsDeletingId(conversationId);
        deleteConversationMutation.mutate({ id: conversationId });
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || sendMessageMutation.isPending || createConversationMutation.isPending) return;

        // If no conversation is selected, create one first
        if (!selectedConversationId) {
            // Generate title from first message (truncate to maxConversationTitleLength)
            const title = messageInput.trim().slice(0, clientConfig.chat.maxConversationTitleLength);
            createConversationMutation.mutate(
                { title },
                {
                    onSuccess: (conversation) => {
                        // Send message to the newly created conversation
                        sendMessageMutation.mutate({
                            conversationId: conversation.id,
                            content: messageInput.trim(),
                        });
                    },
                },
            );
        } else {
            sendMessageMutation.mutate({
                conversationId: selectedConversationId,
                content: messageInput.trim(),
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
                        sendMessageMutation.reset();
                        createConversationMutation.reset();
                        deleteConversationMutation.reset();
                    }}
                />
                <MessageList messages={displayMessages} isLoading={loadingMessages} />
                <MessageInput
                    value={messageInput}
                    onChange={setMessageInput}
                    onSubmit={handleSendMessage}
                    disabled={false}
                    isSubmitting={sendMessageMutation.isPending || createConversationMutation.isPending}
                />
            </div>
        </div>
    );
}
