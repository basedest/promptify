'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Star, Brain, Eye, Code, Wrench, BookOpen } from 'lucide-react';
import { trpc } from 'src/shared/api/trpc/client';
import { Popover, PopoverContent, PopoverTrigger } from 'src/shared/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'src/shared/ui/command';
import { Button } from 'src/shared/ui/button';
import { Badge } from 'src/shared/ui/badge';
import {
    DEVELOPER_META,
    type ModelCapability,
    type ModelDefinition,
    type ModelDeveloper,
} from 'src/shared/config/models';
import { ProviderIcon, useFavoriteModels, useBenchmarks, useModelDisplay } from 'src/entities/model';

const capabilityIcons: Record<ModelCapability, React.FC<{ className?: string }>> = {
    reasoning: Brain,
    vision: Eye,
    tools: Wrench,
    code: Code,
    'long-context': BookOpen,
};

function ThroughputBadge({ throughput }: { throughput: ModelDefinition['throughput'] }) {
    if (throughput === null) return null;
    return (
        <Badge variant="outline" className="gap-0.5 px-1 py-0 text-[10px]">
            {throughput} tok/s
        </Badge>
    );
}

function BenchmarkBadges({ scores }: { scores: Map<string, number> | undefined }) {
    if (!scores || scores.size === 0) return null;
    const order = ['Intelligence', 'Coding', 'Math'];
    return (
        <>
            {order.map((group) => {
                const score = scores.get(group);
                if (score === undefined) return null;
                const colorClass =
                    score >= 85
                        ? 'text-green-600'
                        : score >= 75
                          ? 'text-blue-500'
                          : score >= 60
                            ? 'text-amber-500'
                            : 'text-muted-foreground';
                return (
                    <Badge key={group} variant="outline" className={`gap-0.5 px-1 py-0 text-[10px] ${colorClass}`}>
                        {group[0]} {score.toFixed(0)}
                    </Badge>
                );
            })}
        </>
    );
}

function ModelItem({
    model,
    isSelected,
    isFavorite,
    scores,
    onSelect,
    onToggleFavorite,
}: {
    model: ModelDefinition;
    isSelected: boolean;
    isFavorite: boolean;
    scores: Map<string, number> | undefined;
    onSelect: () => void;
    onToggleFavorite: () => void;
}) {
    const t = useTranslations('models.capabilities');
    const { getModelName, getModelDescriptionShort } = useModelDisplay();
    const name = getModelName(model);
    const descriptionShort = getModelDescriptionShort(model);

    return (
        <CommandItem
            value={`${name} ${model.developer} ${descriptionShort}`}
            onSelect={onSelect}
            className="flex items-center gap-2 px-2 py-1.5"
        >
            <ProviderIcon developer={model.developer as ModelDeveloper} className="text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{name}</span>
                    {isSelected && <span className="text-primary text-xs">&#10003;</span>}
                </div>
                <p className="text-muted-foreground truncate text-xs">{descriptionShort}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <ThroughputBadge throughput={model.throughput} />
                    <BenchmarkBadges scores={scores} />
                    {model.capabilities.map((cap) => {
                        const Icon = capabilityIcons[cap];
                        return (
                            <Badge key={cap} variant="secondary" className="gap-0.5 px-1 py-0 text-[10px]">
                                <Icon className="size-2.5" />
                                {t(cap)}
                            </Badge>
                        );
                    })}
                </div>
            </div>
            <button
                type="button"
                className="text-muted-foreground shrink-0 p-0.5 hover:text-yellow-500"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                }}
            >
                <Star className={`size-3.5 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            </button>
        </CommandItem>
    );
}

type ModelSelectorProps = {
    value: string;
    onChange: (modelId: string) => void;
    disabled?: boolean;
};

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
    const t = useTranslations('models');
    const { getModelName } = useModelDisplay();
    const [open, setOpen] = useState(false);
    const { data: enabledModels = [], isLoading } = trpc.models.list.useQuery(undefined, {
        staleTime: 5 * 60 * 1000,
    });
    const { favorites, isFavorite, toggleFavorite } = useFavoriteModels();
    const scoreMap = useBenchmarks();

    const selectedModel = useMemo(() => enabledModels.find((m) => m.id === value), [enabledModels, value]);

    // Group models by developer
    const sortedDevelopers = useMemo(() => {
        const modelsByDeveloper = new Map<ModelDeveloper, ModelDefinition[]>();
        for (const model of enabledModels) {
            const existing = modelsByDeveloper.get(model.developer as ModelDeveloper) ?? [];
            existing.push(model);
            modelsByDeveloper.set(model.developer as ModelDeveloper, existing);
        }
        return [...modelsByDeveloper.entries()].sort(
            (a, b) => DEVELOPER_META[a[0]].sortOrder - DEVELOPER_META[b[0]].sortOrder,
        );
    }, [enabledModels]);

    const handleSelect = (modelId: string) => {
        onChange(modelId);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled || isLoading}
                    className="text-muted-foreground hover:text-foreground h-auto gap-1.5 px-2 py-1 text-xs font-normal"
                >
                    {isLoading ? (
                        <span className="text-muted-foreground">...</span>
                    ) : selectedModel ? (
                        <>
                            <ProviderIcon developer={selectedModel.developer as ModelDeveloper} />
                            <span>{getModelName(selectedModel)}</span>
                        </>
                    ) : (
                        <span>{value}</span>
                    )}
                    <ChevronDown className="size-3 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={t('searchPlaceholder')} />
                    <CommandList className="max-h-[320px]">
                        <CommandEmpty>{t('noResults')}</CommandEmpty>
                        {favorites.length > 0 && (
                            <CommandGroup heading={t('favorites')}>
                                {favorites.map((model) => (
                                    <ModelItem
                                        key={`fav-${model.id}`}
                                        model={model}
                                        isSelected={model.id === value}
                                        isFavorite={true}
                                        scores={scoreMap.get(model.id)}
                                        onSelect={() => handleSelect(model.id)}
                                        onToggleFavorite={() => toggleFavorite(model.id)}
                                    />
                                ))}
                            </CommandGroup>
                        )}
                        {sortedDevelopers.map(([developer, models]) => (
                            <CommandGroup key={developer} heading={DEVELOPER_META[developer as ModelDeveloper].label}>
                                {models.map((model) => (
                                    <ModelItem
                                        key={model.id}
                                        model={model}
                                        isSelected={model.id === value}
                                        isFavorite={isFavorite(model.id)}
                                        scores={scoreMap.get(model.id)}
                                        onSelect={() => handleSelect(model.id)}
                                        onToggleFavorite={() => toggleFavorite(model.id)}
                                    />
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
