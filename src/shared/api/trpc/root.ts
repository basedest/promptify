import { createTRPCRouter } from './init';
import { conversationRouter } from 'src/entities/conversation/api';
import { messageRouter } from 'src/entities/message/api';
import { tokenTrackingRouter } from 'src/shared/lib/token-tracking/router';

/**
 * Root tRPC router
 * Combines all sub-routers
 */
export const appRouter = createTRPCRouter({
    conversation: conversationRouter,
    message: messageRouter,
    tokenTracking: tokenTrackingRouter,
});

export type AppRouter = typeof appRouter;
