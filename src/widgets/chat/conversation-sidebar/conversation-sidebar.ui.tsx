'use client';

import { useTranslations } from 'next-intl';
import { ConversationCard } from 'src/entities/conversation/ui';
import { ConversationItemMenu } from 'src/widgets/chat/conversation-item-menu';
import { UserDropdown } from 'src/widgets/user-dropdown';
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
        <div className="bg-muted/10 flex h-screen w-80 flex-col border-r">
            <div className="flex min-h-0 flex-1 flex-col p-4">
                <div className="mb-4 flex shrink-0 items-center justify-between">
                    <h2 className="text-lg font-semibold">{t('conversations')}</h2>
                    <Button onClick={onNewChat} size="sm">
                        {t('newChat')}
                    </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto rounded-md border [scrollbar-color:var(--color-muted)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent">
                    <div className="divide-y">
                        {conversations.length > 0 ? (
                            conversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    className="group relative flex min-h-0 items-stretch border-transparent first:rounded-t-md last:rounded-b-md"
                                >
                                    <div className="min-w-0 flex-1">
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
                                    <div className="flex shrink-0 items-center pr-1">
                                        <ConversationItemMenu
                                            conversationId={conv.id}
                                            conversationTitle={conv.title}
                                            onDelete={onDelete}
                                            isDeleting={isDeletingId === conv.id}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground border-0 p-4 text-center text-sm">
                                {t('noConversations')}
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-auto border-t p-2">
                <UserDropdown />
            </div>
        </div>
    );
}
