import 'server-only';
import type { PrismaClient } from 'src/generated/prisma/client';

export type ModelCapability = 'reasoning' | 'vision' | 'tools' | 'code' | 'long-context';

export type ModelDefinition = {
    id: string;
    nameKey: string;
    developer: string;
    provider: string;
    descriptionShortKey?: string;
    descriptionLongKey?: string;
    capabilities: ModelCapability[];
    throughput: number | null;
    latency: number | null;
    contextWindow: number;
    inputCostPer1M: number; // micro-USD
    outputCostPer1M: number; // micro-USD
    tier: 'free' | 'standard' | 'premium';
    enabled: boolean;
    archived: boolean;
    sortOrder: number;
};

const CAPABILITY_NAMES: ModelCapability[] = ['reasoning', 'vision', 'tools', 'code', 'long-context'];

function isModelCapability(name: string): name is ModelCapability {
    return CAPABILITY_NAMES.includes(name as ModelCapability);
}

type AiModelRow = {
    id: string;
    nameKey: string;
    developer: string;
    provider: string;
    descriptionShortKey: string | null;
    descriptionLongKey: string | null;
    throughput: number | null;
    latency: number | null;
    contextWindow: number;
    inputCostPer1M: number;
    outputCostPer1M: number;
    tier: string;
    enabled: boolean;
    archived: boolean;
    sortOrder: number;
    capabilities: { name: string }[];
};

function normalizeModel(row: AiModelRow): ModelDefinition {
    return {
        id: row.id,
        nameKey: row.nameKey,
        developer: row.developer,
        provider: row.provider,
        descriptionShortKey: row.descriptionShortKey ?? undefined,
        descriptionLongKey: row.descriptionLongKey ?? undefined,
        capabilities: row.capabilities.map((c) => c.name).filter(isModelCapability),
        throughput: row.throughput,
        latency: row.latency,
        contextWindow: row.contextWindow,
        inputCostPer1M: row.inputCostPer1M,
        outputCostPer1M: row.outputCostPer1M,
        tier: row.tier as 'free' | 'standard' | 'premium',
        enabled: row.enabled,
        archived: row.archived,
        sortOrder: row.sortOrder,
    };
}

const modelSelect = {
    id: true,
    nameKey: true,
    developer: true,
    provider: true,
    descriptionShortKey: true,
    descriptionLongKey: true,
    throughput: true,
    latency: true,
    contextWindow: true,
    inputCostPer1M: true,
    outputCostPer1M: true,
    tier: true,
    enabled: true,
    archived: true,
    sortOrder: true,
    capabilities: { select: { name: true } },
} as const;

export async function getModelById(prisma: PrismaClient, id: string): Promise<ModelDefinition | null> {
    const row = await prisma.aiModel.findFirst({
        where: { id },
        select: modelSelect,
    });
    if (!row) return null;
    return normalizeModel(row as AiModelRow);
}

export async function getEnabledModels(prisma: PrismaClient): Promise<ModelDefinition[]> {
    const rows = await prisma.aiModel.findMany({
        where: { enabled: true, archived: false },
        orderBy: { sortOrder: 'asc' },
        select: modelSelect,
    });
    return rows.map((row) => normalizeModel(row as AiModelRow));
}

export async function isValidModelId(prisma: PrismaClient, id: string): Promise<boolean> {
    const model = await prisma.aiModel.findFirst({
        where: { id, enabled: true, archived: false },
        select: { id: true },
    });
    return !!model;
}

export function calculateCost(model: ModelDefinition | null, promptTokens: number, completionTokens: number): number {
    if (!model) return 0;
    const usd =
        (promptTokens / 1_000_000) * model.inputCostPer1M + (completionTokens / 1_000_000) * model.outputCostPer1M;
    return Math.round(usd);
}
