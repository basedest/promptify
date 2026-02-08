import { createTRPCRouter } from './init';
import { conversationRouter } from './conversation.router';
import { messageRouter } from './message.router';
import { tokenTrackingRouter } from './token-tracking.router';
import { piiDetectionRouter } from './pii-detection.router';
import { piiDetectionAdminRouter } from './admin.router';

/**
 * Root tRPC router
 * Combines all sub-routers
 */
export const appRouter = createTRPCRouter({
    conversation: conversationRouter,
    message: messageRouter,
    tokenTracking: tokenTrackingRouter,
    piiDetection: piiDetectionRouter,
    piiDetectionAdmin: piiDetectionAdminRouter,
});

export type AppRouter = typeof appRouter;
