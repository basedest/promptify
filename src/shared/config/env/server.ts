import 'server-only';
import { z } from 'zod';

const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'fatal', 'trace']);
const nodeEnvSchema = z.enum(['development', 'production', 'test']);

const rawServerEnvSchema = z.object({
    NODE_ENV: z.string().optional(),
    DATABASE_URL: z.url().min(1, 'DATABASE_URL is required'),
    BETTER_AUTH_URL: z.url().optional(),
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters long'),
    OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
    LOG_LEVEL: z.string().optional(),
});

const serverEnvSchema = rawServerEnvSchema.transform((raw): ServerConfig => {
    const nodeEnv = nodeEnvSchema.catch('development').parse(raw.NODE_ENV ?? 'development');
    const logLevel = logLevelSchema.catch(nodeEnv === 'development' ? 'debug' : 'info').parse(raw.LOG_LEVEL);

    const betterAuthBaseUrl = raw.BETTER_AUTH_URL?.trim() || 'http://localhost:3000';

    return {
        nodeEnv,
        database: {
            url: raw.DATABASE_URL,
        },
        auth: {
            secret: raw.BETTER_AUTH_SECRET,
            baseUrl: betterAuthBaseUrl,
        },
        ai: {
            openRouterApiKey: raw.OPENROUTER_API_KEY,
            model: 'openai/gpt-5-nano',
        },
        logLevel,
        chat: {
            // Token quotas
            dailyTokenLimit: 50_000,

            // Conversation limits
            maxConversationsPerUser: 25,
            maxConversationTitleLength: 50,

            // Message limits
            maxMessageLength: 4_000,
            maxMessagesPerConversation: 200,

            // Context management
            contextWindowSize: 20,

            // Rate limiting
            maxRequestsPerMinute: 10,
        },
    };
});

export type ServerConfig = {
    nodeEnv: 'development' | 'production' | 'test';
    database: { url: string };
    auth: { secret: string; baseUrl: string };
    ai: { openRouterApiKey: string; model: string };
    logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'trace';
    chat: {
        dailyTokenLimit: number;
        maxConversationsPerUser: number;
        maxConversationTitleLength: number;
        maxMessageLength: number;
        maxMessagesPerConversation: number;
        contextWindowSize: number;
        maxRequestsPerMinute: number;
    };
};

function getRawEnv(): Record<string, string | undefined> {
    return {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        LOG_LEVEL: process.env.LOG_LEVEL,
    };
}

let cached: ServerConfig | null = null;

export function getServerConfig(): ServerConfig {
    if (cached) return cached;
    const raw = getRawEnv();
    const parsed = serverEnvSchema.safeParse(raw);
    if (!parsed.success) {
        const tree = z.treeifyError(parsed.error);
        const message = tree.errors[0] ?? parsed.error.message;
        throw new Error(`Server config validation failed: ${message}`);
    }
    cached = parsed.data;
    return parsed.data;
}
