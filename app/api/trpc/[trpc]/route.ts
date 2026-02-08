import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from 'src/app/api-routers/app.router';
import { createTRPCContext } from 'src/app/api-routers/init';

const handler = (req: Request) =>
    fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: createTRPCContext,
        onError: ({ path, error }) => {
            console.error(`tRPC Error on '${path}':`, error);
        },
    });

export { handler as GET, handler as POST };
