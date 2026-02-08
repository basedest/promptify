'use client';

import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from 'src/shared/ui/sidebar';
import { useChats } from 'src/entities/chat';
import { cn } from 'src/shared/lib/utils';
import { ChatItemMenu } from 'src/widgets/chat-item-menu/chat-item-menu.ui';

export function SidebarChats() {
    const t = useTranslations('sidebar');
    const {
        chats: conversations,
        selectedChatId: selectedConversationId,
        setSelectedChatId: setSelectedConversationId,
        handleNewChat,
        handleDeleteChat: handleDeleteConversation,
        isDeletingId,
    } = useChats();

    const { open } = useSidebar();

    return (
        <SidebarGroup>
            <SidebarGroupLabel>{t('chats')}</SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip={t('newChat')}
                        onClick={handleNewChat}
                        className={cn(
                            'group hover:bg-accent/80 relative flex min-h-0 items-stretch border-transparent',
                            selectedConversationId === undefined && 'bg-accent',
                        )}
                    >
                        <MessageSquare />
                        <span>{t('newChat')}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                {open &&
                    conversations.map((conv) => (
                        <SidebarMenuItem key={conv.id}>
                            <SidebarMenuButton
                                onClick={() => setSelectedConversationId(conv.id)}
                                className={cn(
                                    'group hover:bg-accent/80 relative flex min-h-0 items-stretch border-transparent',
                                    conv.id === selectedConversationId && 'bg-accent',
                                )}
                            >
                                <div
                                    className="group/conversation flex w-full min-w-0 items-center gap-2"
                                    data-active={conv.id === selectedConversationId}
                                >
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium" title={conv.title}>
                                        {conv.title}
                                    </span>
                                    <ChatItemMenu
                                        chatId={conv.id}
                                        chatTitle={conv.title}
                                        onDelete={handleDeleteConversation}
                                        isDeleting={isDeletingId === conv.id}
                                    />
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
