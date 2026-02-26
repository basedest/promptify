'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { trpc } from 'src/shared/api/trpc/client';
import { getLegalLinks } from 'src/shared/lib/legal-links';
import { useAuthDialog } from 'src/features/auth/auth-dialog';
import { getClientConfig } from 'src/shared/config/env/client';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { MessageList } from 'src/widgets/message-list';
import { MessageInput } from 'src/widgets/message-input';
import { ErrorBanner } from 'src/widgets/error-banner';
import { useStreamMessage } from 'src/features/message/send-message/use-stream-message';
import { ChatHeader } from 'src/widgets/chat-header';
import { useChats } from 'src/entities/chat';
import { Skeleton } from 'src/shared/ui/skeleton';

const GREETING_COUNT = 8;

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

type ChatViewProps = {
    chatId?: string;
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

export function ChatView({ chatId }: ChatViewProps) {
    const t = useTranslations('chat');
    const tAuth = useTranslations('auth');
    const legal = getLegalLinks(useLocale());
    const utils = trpc.useUtils();
    const clientConfig = getClientConfig();
    const { data: session, isPending: sessionPending } = authClient.useSession();
    const { openSignIn } = useAuthDialog();
    const [streamError, setStreamError] = useState<string | null>(null);
    const [optimisticMessage, setOptimisticMessage] = useState<DisplayMessage | null>(null);
    const [committedMessages, setCommittedMessages] = useState<DisplayMessage[] | null>(null);
    const [pendingChatId, setPendingChatId] = useState<string | null>(null);
    const [greetingIndex] = useState(() => Math.floor(Math.random() * GREETING_COUNT));

    const {
        loadingChats,
        selectedChatId,
        messageInput,
        setSelectedChatId,
        setMessageInput,
        handleNewChat,
        createChatMutation,
        deleteChatMutation,
    } = useChats();
    const activeChatId = chatId ?? selectedChatId;
    const { data: messages, isLoading: loadingMessages } = trpc.message.list.useQuery(
        { conversationId: activeChatId! },
        { enabled: !!activeChatId && !!session },
    );

    const { isStreaming, streamingContent, piiMaskRegions, sendMessage } = useStreamMessage();

    useEffect(() => {
        if (chatId && chatId !== selectedChatId) {
            setSelectedChatId(chatId);
            return;
        }

        if (!chatId && selectedChatId && pendingChatId === null && !isStreaming && !createChatMutation.isPending) {
            handleNewChat();
        }
    }, [
        chatId,
        selectedChatId,
        pendingChatId,
        setSelectedChatId,
        handleNewChat,
        isStreaming,
        createChatMutation.isPending,
    ]);

    // Clear committed messages once the DB query has caught up (all IDs present in fresh data).
    useEffect(() => {
        if (!committedMessages || !messages) return;
        if (committedMessages.every((cm) => (messages as MessageListItem[]).some((m) => m.id === cm.id))) {
            queueMicrotask(() => setCommittedMessages(null));
        }
    }, [messages, committedMessages]);

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
        if (!session) {
            openSignIn();
            return;
        }

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
        if (!activeChatId) {
            // Generate title from first message (truncate to maxConversationTitleLength)
            const title = content.slice(0, clientConfig.chat.maxConversationTitleLength);
            createChatMutation.mutate(
                { title },
                {
                    onSuccess: async (chat) => {
                        setPendingChatId(chat.id);
                        await sendMessage({
                            conversationId: chat.id,
                            content,
                            onComplete: ({ userMessageId, assistantMessageId, totalTokens, assistantContent }) => {
                                // Immediately show both messages via React state so there is no
                                // blank flash between streamingContent clearing and the DB refetch.
                                // Use functional update to ACCUMULATE rather than overwrite, so
                                // earlier exchanges' committed messages aren't lost if their
                                // background refetch hasn't landed yet.
                                const now = new Date();
                                setCommittedMessages((prev) => [
                                    ...(prev ?? []),
                                    { id: userMessageId, role: 'user', content, tokenCount: 0, createdAt: now },
                                    {
                                        id: assistantMessageId,
                                        role: 'assistant',
                                        content: assistantContent,
                                        tokenCount: totalTokens,
                                        createdAt: now,
                                    },
                                ]);
                                setOptimisticMessage(null);
                                // Background invalidate — useEffect will clear committedMessages once
                                // the refetch lands and both IDs are present in the query result.
                                void utils.message.list.invalidate({ conversationId: chat.id });
                                void utils.chat.list.invalidate();
                                void utils.tokenTracking.getUsage.invalidate();
                                // Stay on root page, update URL only - avoids remount/empty-state flicker
                                if (typeof window !== 'undefined') {
                                    window.history.replaceState(null, '', `/chat/${chat.id}`);
                                }
                            },
                            onError: (error) => {
                                setStreamError(error);
                                setOptimisticMessage(null);
                                setCommittedMessages(null);
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
                conversationId: activeChatId,
                content,
                onComplete: ({ userMessageId, assistantMessageId, totalTokens, assistantContent }) => {
                    const now = new Date();
                    setCommittedMessages((prev) => [
                        ...(prev ?? []),
                        { id: userMessageId, role: 'user', content, tokenCount: 0, createdAt: now },
                        {
                            id: assistantMessageId,
                            role: 'assistant',
                            content: assistantContent,
                            tokenCount: totalTokens,
                            createdAt: now,
                        },
                    ]);
                    setOptimisticMessage(null);
                    void utils.message.list.invalidate({ conversationId: activeChatId });
                    void utils.chat.list.invalidate();
                    void utils.tokenTracking.getUsage.invalidate();
                },
                onError: (error) => {
                    setStreamError(error);
                    setOptimisticMessage(null);
                },
            });
        }
    };

    if (loadingChats && !!session) {
        return (
            <div className="flex flex-1 flex-col">
                <ChatHeader />
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
            </div>
        );
    }

    const baseMessages: DisplayMessage[] = activeChatId
        ? ((messages as MessageListItem[]) ?? []).map((msg: MessageListItem) => ({
              ...msg,
              role: msg.role as DisplayMessage['role'],
              createdAt: new Date(msg.createdAt),
          }))
        : [];

    // Merge committed messages (user + assistant from the just-completed stream) that
    // haven't yet appeared in the DB query result. This bridges the gap between
    // streamingContent being cleared and the invalidate refetch completing.
    const messagesWithCommitted = committedMessages
        ? [...baseMessages, ...committedMessages.filter((cm) => !baseMessages.some((m) => m.id === cm.id))]
        : baseMessages;

    // Add optimistic user message if not already present.
    const displayMessages = optimisticMessage
        ? messagesWithCommitted.some((m) => m.content === optimisticMessage.content && m.role === 'user')
            ? messagesWithCommitted
            : [...messagesWithCommitted, optimisticMessage]
        : messagesWithCommitted;

    // Only show empty chat greeting when truly idle with no chat activity in progress
    const isEmptyChat =
        !activeChatId && !optimisticMessage && !pendingChatId && !isStreaming && !createChatMutation.isPending;

    const errorBannerEl = (
        <ErrorBanner
            error={error}
            onDismiss={() => {
                setStreamError(null);
                createChatMutation.reset();
                deleteChatMutation.reset();
            }}
        />
    );

    const messageInputEl = (
        <MessageInput
            value={messageInput}
            onChange={setMessageInput}
            onSubmit={handleSendMessage}
            disabled={false}
            isSubmitting={isStreaming || createChatMutation.isPending}
            isAtBottom={!isEmptyChat}
        />
    );

    if (isEmptyChat) {
        return (
            <div className="flex flex-1 flex-col pb-4">
                <ChatHeader />
                {errorBannerEl}
                <div className="flex flex-1 flex-col md:items-center md:justify-center md:gap-6">
                    <div className="flex flex-1 items-center justify-center p-4 md:flex-none md:p-0">
                        <h1 className="text-foreground text-center text-3xl font-semibold tracking-tight md:text-4xl">
                            {!session && !sessionPending ? t('guestGreeting') : t(`greetings.${greetingIndex}`)}
                        </h1>
                    </div>
                    <div className="w-full md:max-w-3xl md:px-4">{messageInputEl}</div>
                </div>
                {!session && !sessionPending && (
                    <p className="text-muted-foreground text-center text-xs">
                        {tAuth('agreeToContinue')}{' '}
                        <Link href={legal.terms} className="hover:text-primary underline underline-offset-4">
                            {tAuth('termsOfService')}
                        </Link>{' '}
                        {tAuth('and')}{' '}
                        <Link href={legal.privacyPolicy} className="hover:text-primary underline underline-offset-4">
                            {tAuth('privacyPolicy')}
                        </Link>
                        .
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col">
            <ChatHeader />
            {errorBannerEl}
            <MessageList
                messages={displayMessages}
                isLoading={loadingMessages && !isStreaming && !optimisticMessage}
                isStreaming={isStreaming}
                streamingContent={streamingContent}
                streamingPiiMaskRegions={piiMaskRegions}
            />
            {messageInputEl}
        </div>
    );
}
