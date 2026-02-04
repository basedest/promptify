import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from 'src/shared/lib/prisma';
import { logger } from 'src/shared/lib/logger';

// Requires env: BETTER_AUTH_URL (e.g. http://localhost:3000), BETTER_AUTH_SECRET (32+ chars)
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    plugins: [nextCookies()],
});

export type Auth = typeof auth;

/**
 * Get the current session on the server. Pass the result of await headers() from next/headers.
 * Returns null if not authenticated or on error (errors are logged).
 */
export async function getSession(requestHeaders: Awaited<ReturnType<typeof import('next/headers').headers>>) {
    try {
        return await auth.api.getSession({ headers: requestHeaders });
    } catch (err) {
        logger.error({ err, context: 'getSession' }, 'Failed to get session');
        return null;
    }
}
