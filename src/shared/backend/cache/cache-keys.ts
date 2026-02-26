export const CacheKeys = {
    chatList: (userId: string) => `cache:chat:list:${userId}`,
    userLocale: (userId: string) => `cache:user:locale:${userId}`,
    messageList: (conversationId: string, limit?: number, offset?: number) =>
        `cache:msg:list:${conversationId}:${limit ?? 'all'}:${offset ?? 0}`,
    messageListPattern: (conversationId: string) => `cache:msg:list:${conversationId}:*`,
} as const;
