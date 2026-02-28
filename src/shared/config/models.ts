export type ModelDeveloper =
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'meta'
    | 'deepseek'
    | 'mistral'
    | 'xai'
    | 'qwen'
    | 'moonshot'
    | 'zhipuai'
    | 'minimax';

export type ModelProvider =
    | 'openrouter'
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'meta'
    | 'deepseek'
    | 'mistral'
    | 'xai'
    | 'qwen'
    | 'moonshot'
    | 'zhipuai'
    | 'minimax';

export type ModelCapability = 'reasoning' | 'vision' | 'tools' | 'code' | 'long-context';

/** Shared model shape (from Prisma/tRPC). Costs in micro-USD. nameKey/descriptionShortKey are i18n keys. */
export type ModelDefinition = {
    id: string;
    nameKey: string;
    developer: ModelDeveloper | string;
    provider: ModelProvider | string;
    descriptionShortKey?: string;
    descriptionLongKey?: string;
    capabilities: ModelCapability[];
    throughput: number | null;
    latency: number | null;
    contextWindow: number;
    inputCostPer1M: number;
    outputCostPer1M: number;
    tier: 'free' | 'standard' | 'premium';
    enabled: boolean;
    archived: boolean;
    sortOrder: number;
};

export type DeveloperMeta = {
    label: string;
    sortOrder: number;
};

export const DEVELOPER_META: Record<ModelDeveloper, DeveloperMeta> = {
    openai: { label: 'OpenAI', sortOrder: 1 },
    anthropic: { label: 'Anthropic', sortOrder: 2 },
    google: { label: 'Google', sortOrder: 3 },
    meta: { label: 'Meta', sortOrder: 4 },
    deepseek: { label: 'DeepSeek', sortOrder: 5 },
    mistral: { label: 'Mistral', sortOrder: 6 },
    xai: { label: 'xAI', sortOrder: 7 },
    qwen: { label: 'Qwen', sortOrder: 8 },
    moonshot: { label: 'Moonshot', sortOrder: 9 },
    zhipuai: { label: 'ZhipuAI', sortOrder: 10 },
    minimax: { label: 'MiniMax', sortOrder: 11 },
};

export const DEFAULT_MODEL_ID = 'openai/gpt-5-mini';

export function toMicroUSD(usd: number): number {
    return Math.round(usd * 1_000_000);
}
