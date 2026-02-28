'use client';

import { trpc } from 'src/shared/api/trpc/client';
import type { ModelDeveloper } from 'src/shared/config/models';
import { ProviderIcon, useModelDisplay } from 'src/entities/model';

type ModelBadgeProps = {
    modelId: string;
    className?: string;
};

export function ModelBadge({ modelId, className }: ModelBadgeProps) {
    const { data: model } = trpc.models.getById.useQuery({ id: modelId });
    const { getModelName } = useModelDisplay();
    if (!model) return <span className={className}>{modelId}</span>;

    return (
        <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
            <ProviderIcon developer={model.developer as ModelDeveloper} />
            <span className="truncate text-sm">{getModelName(model)}</span>
        </span>
    );
}
