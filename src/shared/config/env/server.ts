import 'server-only';
import { z } from 'zod';

const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'fatal', 'trace']);
const nodeEnvSchema = z.enum(['development', 'production', 'test']);

/** PII types supported by the detection service (FR5) */
export const PII_TYPES = [
    'email',
    'phone',
    'ssn',
    'credit_card',
    'address',
    'full_name',
    'gov_id',
    'ip',
    'dob',
] as const;

export type PiiType = (typeof PII_TYPES)[number];

/** Fallback when PII detection is unavailable (FR5) */
export const PII_FALLBACK_VALUES = ['continue_without_masking', 'fail'] as const;

export type PiiFallbackWhenUnavailable = (typeof PII_FALLBACK_VALUES)[number];

const rawServerEnvSchema = z.object({
    NODE_ENV: z.string().optional(),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    /** Direct PostgreSQL URL for migrations when using Prisma Accelerate (prisma://). Set to same as DATABASE_URL when not using Accelerate. */
    DIRECT_DATABASE_URL: z.string().optional(),
    BETTER_AUTH_URL: z.url().optional(),
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters long'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
    LOG_LEVEL: z.string().optional(),
    // PII detection (FR5, admin-only)
    PII_DETECTION_ENABLED: z.string().optional(),
    PII_CHUNK_BATCH_SIZE: z.string().optional(),
    PII_MAX_BATCH_CHARS: z.string().optional(),
    PII_DETECTION_TIMEOUT_MS: z.string().optional(),
    PII_DETECTION_MODEL: z.string().optional(),
    PII_TYPES: z.string().optional(),
    PII_FALLBACK_WHEN_UNAVAILABLE: z.string().optional(),
    /** App URL for OpenRouter HTTP-Referer (e.g. https://yapp.local). Falls back to BETTER_AUTH_URL. */
    APP_URL: z.url().optional(),
    /** App title for OpenRouter X-Title header (e.g. Yapp). */
    APP_TITLE: z.string().optional(),
    MAILER_PROVIDER: z.string().optional(),
    MAILER_FROM: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    MAILER_RETRY_ENABLED: z.string().optional(),
    MAILER_RATE_LIMIT_PER_MINUTE: z.string().optional(),
    REDIS_URL: z.string().optional(),
});

function parsePiiTypes(value: string | undefined): PiiType[] {
    if (!value?.trim()) return [...PII_TYPES];
    const parts = value.split(',').map((s) => s.trim().toLowerCase());
    const valid = parts.filter((p): p is PiiType => PII_TYPES.includes(p as PiiType));
    return valid.length > 0 ? valid : [...PII_TYPES];
}

const serverEnvSchema = rawServerEnvSchema.transform((raw): ServerConfig => {
    const nodeEnv = nodeEnvSchema.catch('development').parse(raw.NODE_ENV ?? 'development');
    const logLevel = logLevelSchema.catch(nodeEnv === 'development' ? 'debug' : 'info').parse(raw.LOG_LEVEL);

    const betterAuthBaseUrl = raw.BETTER_AUTH_URL?.trim() || 'http://localhost:3000';
    const appUrl = raw.APP_URL?.trim() || betterAuthBaseUrl;
    const appTitle = raw.APP_TITLE?.trim() || 'Yapp';

    const piiEnabled = raw.PII_DETECTION_ENABLED?.toLowerCase() === 'true';
    const piiChunkBatchSize = Math.max(1, parseInt(raw.PII_CHUNK_BATCH_SIZE ?? '10', 10) || 5);
    const piiMaxBatchChars = Math.max(100, parseInt(raw.PII_MAX_BATCH_CHARS ?? '500', 10) || 500);
    const piiTimeoutMs = Math.max(1000, parseInt(raw.PII_DETECTION_TIMEOUT_MS ?? '5000', 10) || 5000);
    const piiModel = raw.PII_DETECTION_MODEL?.trim() || 'openai/gpt-4o-mini';
    const piiFallbackRaw = raw.PII_FALLBACK_WHEN_UNAVAILABLE?.toLowerCase() ?? 'continue_without_masking';
    const piiFallback: PiiFallbackWhenUnavailable = PII_FALLBACK_VALUES.includes(
        piiFallbackRaw as PiiFallbackWhenUnavailable,
    )
        ? (piiFallbackRaw as PiiFallbackWhenUnavailable)
        : 'continue_without_masking';

    const databaseUrl = raw.DATABASE_URL;
    const isAccelerate = databaseUrl.startsWith('prisma://');
    if (isAccelerate && !raw.DIRECT_DATABASE_URL?.trim()) {
        throw new Error(
            'DIRECT_DATABASE_URL is required when using Prisma Accelerate (DATABASE_URL starts with prisma://). Use your direct PostgreSQL URL for migrations.',
        );
    }
    return {
        nodeEnv,
        database: {
            url: databaseUrl,
            directUrl: raw.DIRECT_DATABASE_URL?.trim(),
        },
        auth: {
            secret: raw.BETTER_AUTH_SECRET,
            baseUrl: betterAuthBaseUrl,
            ...(raw.GOOGLE_CLIENT_ID && raw.GOOGLE_CLIENT_SECRET
                ? { google: { clientId: raw.GOOGLE_CLIENT_ID, clientSecret: raw.GOOGLE_CLIENT_SECRET } }
                : {}),
        },
        ai: {
            openRouterApiKey: raw.OPENROUTER_API_KEY,
            model: 'openai/gpt-4o-mini',
            appUrl,
            appTitle,
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
        piiDetection: {
            enabled: piiEnabled,
            chunkBatchSize: piiChunkBatchSize,
            maxBatchChars: piiMaxBatchChars,
            detectionTimeoutMs: piiTimeoutMs,
            model: piiModel,
            piiTypes: parsePiiTypes(raw.PII_TYPES),
            fallbackWhenUnavailable: piiFallback,
        },
        mailer: {
            provider: (raw.MAILER_PROVIDER?.trim() || 'log') as 'log' | 'resend',
            from: raw.MAILER_FROM?.trim() || 'onboarding@resend.dev',
            resendApiKey: raw.RESEND_API_KEY?.trim() || undefined,
            retryEnabled: raw.MAILER_RETRY_ENABLED === 'true',
            rateLimitPerMinute: raw.MAILER_RATE_LIMIT_PER_MINUTE
                ? parseInt(raw.MAILER_RATE_LIMIT_PER_MINUTE, 10)
                : undefined,
        },
        redis: {
            url: raw.REDIS_URL?.trim() || undefined,
        },
    };
});

export type ServerConfig = {
    nodeEnv: 'development' | 'production' | 'test';
    database: { url: string; directUrl?: string };
    auth: { secret: string; baseUrl: string; google?: { clientId: string; clientSecret: string } };
    ai: { openRouterApiKey: string; model: string; appUrl: string; appTitle: string };
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
    piiDetection: {
        enabled: boolean;
        chunkBatchSize: number;
        maxBatchChars: number;
        detectionTimeoutMs: number;
        model: string;
        piiTypes: PiiType[];
        fallbackWhenUnavailable: PiiFallbackWhenUnavailable;
    };
    mailer: {
        provider: 'log' | 'resend';
        from: string;
        resendApiKey?: string;
        retryEnabled?: boolean;
        rateLimitPerMinute?: number;
    };
    redis: { url: string | undefined };
};

function getRawEnv(): Record<string, string | undefined> {
    return {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        LOG_LEVEL: process.env.LOG_LEVEL,
        PII_DETECTION_ENABLED: process.env.PII_DETECTION_ENABLED,
        PII_CHUNK_BATCH_SIZE: process.env.PII_CHUNK_BATCH_SIZE,
        PII_MAX_BATCH_CHARS: process.env.PII_MAX_BATCH_CHARS,
        PII_DETECTION_TIMEOUT_MS: process.env.PII_DETECTION_TIMEOUT_MS,
        PII_DETECTION_MODEL: process.env.PII_DETECTION_MODEL,
        PII_TYPES: process.env.PII_TYPES,
        PII_FALLBACK_WHEN_UNAVAILABLE: process.env.PII_FALLBACK_WHEN_UNAVAILABLE,
        APP_URL: process.env.APP_URL,
        APP_TITLE: process.env.APP_TITLE,
        MAILER_PROVIDER: process.env.MAILER_PROVIDER,
        MAILER_FROM: process.env.MAILER_FROM,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        MAILER_RETRY_ENABLED: process.env.MAILER_RETRY_ENABLED,
        MAILER_RATE_LIMIT_PER_MINUTE: process.env.MAILER_RATE_LIMIT_PER_MINUTE,
        REDIS_URL: process.env.REDIS_URL,
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
