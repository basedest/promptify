import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { createTranslator } from 'next-intl';
import { prisma } from 'src/shared/backend/prisma';
import { logger } from 'src/shared/backend/logger';
import { getServerConfig } from 'src/shared/config/env';
import { getMailer } from 'src/shared/backend/mailer';
import VerificationEmail from '~/src/shared/emails/yapp-verify-email';

const config = getServerConfig();

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    baseURL: config.auth.baseUrl,
    secret: config.auth.secret,
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            const locale = 'en';
            const messages = (await import('src/shared/lib/locales/en.json')).default;
            const t = createTranslator({ messages, namespace: 'email.verifyEmail', locale });
            const mailer = getMailer();
            void mailer.send({
                to: user.email,
                subject: t('subject'),
                body: await VerificationEmail({ url, locale }),
            });
            logger.info({ userId: user.id, url, locale }, 'sent verification email');
        },
    },
    ...(config.auth.google && {
        socialProviders: {
            google: {
                clientId: config.auth.google.clientId,
                clientSecret: config.auth.google.clientSecret,
            },
        },
    }),
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
