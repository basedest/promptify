'use client';

import { create } from 'zustand';
import { trpc } from 'src/shared/api/trpc/client';

type ChatListItem = {
    id: string;
    title: string;
    totalTokens: number;
    updatedAt: Date;
    _count: {
        messages: number;
    };
};

type ChatsState = {
    selectedChatId?: string;
    isDeletingId?: string;
    messageInput: string;
    setSelectedChatId: (id: string | undefined) => void;
    setIsDeletingId: (id: string | undefined) => void;
    setMessageInput: (value: string) => void;
    resetChatSelection: () => void;
};

export const useChatsStore = create<ChatsState>((set) => ({
    selectedChatId: undefined,
    isDeletingId: undefined,
    messageInput: '',
    setSelectedChatId: (id) => set({ selectedChatId: id }),
    setIsDeletingId: (id) => set({ isDeletingId: id }),
    setMessageInput: (messageInput) => set({ messageInput }),
    resetChatSelection: () => set({ selectedChatId: undefined }),
}));

export function useChats() {
    const utils = trpc.useUtils();
    const {
        selectedChatId,
        isDeletingId,
        messageInput,
        setSelectedChatId,
        setIsDeletingId,
        setMessageInput,
        resetChatSelection,
    } = useChatsStore();

    const { data: chats, isLoading: loadingChats } = trpc.chat.list.useQuery();

    const createChatMutation = trpc.chat.create.useMutation({
        onSuccess: (chat) => {
            setSelectedChatId(chat.id);
            utils.chat.list.invalidate();
        },
    });

    const deleteChatMutation = trpc.chat.delete.useMutation({
        onSuccess: (_, variables) => {
            if (selectedChatId === variables.id) {
                resetChatSelection();
                setMessageInput('');
            }
            setIsDeletingId(undefined);
            utils.chat.list.invalidate();
        },
        onError: () => {
            setIsDeletingId(undefined);
        },
    });

    const handleNewChat = () => {
        resetChatSelection();
        setMessageInput('');
    };

    const handleDeleteChat = (chatId: string) => {
        setIsDeletingId(chatId);
        deleteChatMutation.mutate({ id: chatId });
    };

    return {
        chats: (chats ?? []) as ChatListItem[],
        loadingChats,
        selectedChatId,
        setSelectedChatId,
        isDeletingId,
        messageInput,
        setMessageInput,
        handleNewChat,
        handleDeleteChat,
        createChatMutation,
        deleteChatMutation,
    };
}
