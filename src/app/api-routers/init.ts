import 'server-only';
import { initTRPC, TRPCError } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { auth } from 'src/shared/backend/auth/auth.server';
import { logger } from 'src/shared/backend/logger';

/**
 * Create tRPC context with authenticated user
 */
export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
    const session = await auth.api.getSession({
        headers: opts.req.headers,
    });

    return {
        session: session ?? null,
        userId: session?.user?.id ?? null,
    };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Initialize tRPC with context
 */
const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError: error.cause,
            },
        };
    },
});

/**
 * Export reusable router and procedure builders
 */
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.userId) {
        logger.warn('Unauthorized tRPC request');
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be logged in to access this resource' });
    }

    return next({
        ctx: {
            ...ctx,
            session: ctx.session,
            userId: ctx.userId,
        },
    });
});
