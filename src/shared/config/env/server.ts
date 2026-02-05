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
    DATABASE_URL: z.url().min(1, 'DATABASE_URL is required'),
    BETTER_AUTH_URL: z.url().optional(),
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters long'),
    OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
    LOG_LEVEL: z.string().optional(),
    // PII detection (FR5, admin-only)
    PII_DETECTION_ENABLED: z.string().optional(),
    PII_CHUNK_BATCH_SIZE: z.string().optional(),
    PII_DETECTION_TIMEOUT_MS: z.string().optional(),
    PII_TYPES: z.string().optional(),
    PII_FALLBACK_WHEN_UNAVAILABLE: z.string().optional(),
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

    const piiEnabled = raw.PII_DETECTION_ENABLED?.toLowerCase() === 'true';
    const piiChunkBatchSize = Math.max(1, parseInt(raw.PII_CHUNK_BATCH_SIZE ?? '5', 10) || 5);
    const piiTimeoutMs = Math.max(1000, parseInt(raw.PII_DETECTION_TIMEOUT_MS ?? '5000', 10) || 5000);
    const piiFallbackRaw = raw.PII_FALLBACK_WHEN_UNAVAILABLE?.toLowerCase() ?? 'continue_without_masking';
    const piiFallback: PiiFallbackWhenUnavailable = PII_FALLBACK_VALUES.includes(
        piiFallbackRaw as PiiFallbackWhenUnavailable,
    )
        ? (piiFallbackRaw as PiiFallbackWhenUnavailable)
        : 'continue_without_masking';

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
        piiDetection: {
            enabled: piiEnabled,
            chunkBatchSize: piiChunkBatchSize,
            detectionTimeoutMs: piiTimeoutMs,
            piiTypes: parsePiiTypes(raw.PII_TYPES),
            fallbackWhenUnavailable: piiFallback,
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
    piiDetection: {
        enabled: boolean;
        chunkBatchSize: number;
        detectionTimeoutMs: number;
        piiTypes: PiiType[];
        fallbackWhenUnavailable: PiiFallbackWhenUnavailable;
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
        PII_DETECTION_ENABLED: process.env.PII_DETECTION_ENABLED,
        PII_CHUNK_BATCH_SIZE: process.env.PII_CHUNK_BATCH_SIZE,
        PII_DETECTION_TIMEOUT_MS: process.env.PII_DETECTION_TIMEOUT_MS,
        PII_TYPES: process.env.PII_TYPES,
        PII_FALLBACK_WHEN_UNAVAILABLE: process.env.PII_FALLBACK_WHEN_UNAVAILABLE,
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
