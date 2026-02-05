import { createTRPCRouter } from './init';
import { conversationRouter } from 'src/entities/conversation/api';
import { messageRouter } from 'src/entities/message/api';

/**
 * Root tRPC router
 * Combines all sub-routers
 */
export const appRouter = createTRPCRouter({
    conversation: conversationRouter,
    message: messageRouter,
});

export type AppRouter = typeof appRouter;
