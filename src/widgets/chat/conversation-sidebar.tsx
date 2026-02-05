'use client';

import { useTranslations } from 'next-intl';
import { ConversationCard } from 'src/entities/conversation/ui';
import { DeleteConversation } from 'src/features/conversation/delete-conversation';
import { TokenUsageDisplay } from 'src/widgets/token-usage';
import { Button } from 'src/shared/ui/button';

type ConversationSidebarProps = {
    conversations: Array<{
        id: string;
        title: string;
        totalTokens: number;
        updatedAt: Date;
        _count: {
            messages: number;
        };
    }>;
    selectedConversationId?: string;
    onConversationSelect?: (id: string) => void;
    onNewChat?: () => void;
    onDelete?: (conversationId: string) => void;
    isDeletingId?: string;
};

export function ConversationSidebar({
    conversations,
    selectedConversationId,
    onConversationSelect,
    onNewChat,
    onDelete,
    isDeletingId,
}: ConversationSidebarProps) {
    const t = useTranslations('chat');

    return (
        <div className="bg-muted/10 flex w-80 flex-col border-r">
            <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{t('conversations')}</h2>
                    <Button onClick={onNewChat} size="sm">
                        {t('newChat')}
                    </Button>
                </div>
                <div className="space-y-2">
                    {conversations.length > 0 ? (
                        conversations.map((conv) => (
                            <div key={conv.id} className="group relative flex items-start gap-1">
                                <div className="flex-1">
                                    <ConversationCard
                                        id={conv.id}
                                        title={conv.title}
                                        messageCount={conv._count.messages}
                                        totalTokens={conv.totalTokens}
                                        updatedAt={conv.updatedAt}
                                        isActive={conv.id === selectedConversationId}
                                        onClick={() => onConversationSelect?.(conv.id)}
                                    />
                                </div>
                                {onDelete && (
                                    <DeleteConversation
                                        conversationId={conv.id}
                                        conversationTitle={conv.title}
                                        onDelete={onDelete}
                                        isDeleting={isDeletingId === conv.id}
                                    />
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-center text-sm">{t('noConversations')}</p>
                    )}
                </div>
            </div>
            <div className="mt-auto">
                <TokenUsageDisplay />
            </div>
        </div>
    );
}
