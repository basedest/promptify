import { createTRPCRouter } from './init';
import { chatRouter } from './chat.router';
import { messageRouter } from './message.router';
import { tokenTrackingRouter } from './token-tracking.router';
import { piiDetectionRouter } from './pii-detection.router';
import { piiDetectionAdminRouter } from './admin.router';
import { userRouter } from './user.router';
import { modelsRouter } from './models.router';

/**
 * Root tRPC router
 * Combines all sub-routers
 */
export const appRouter = createTRPCRouter({
    chat: chatRouter,
    message: messageRouter,
    tokenTracking: tokenTrackingRouter,
    piiDetection: piiDetectionRouter,
    piiDetectionAdmin: piiDetectionAdminRouter,
    user: userRouter,
    models: modelsRouter,
});

export type AppRouter = typeof appRouter;
