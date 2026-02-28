'use client';

import { useTranslations } from 'next-intl';
import type { ModelDefinition } from 'src/shared/config/models';

/**
 * Returns translated model name and description for display.
 * Uses i18n keys stored in the model (nameKey, descriptionShortKey).
 */
export function useModelDisplay() {
    const t = useTranslations();

    return {
        getModelName: (model: ModelDefinition | null | undefined): string => {
            if (!model) return '';
            try {
                return t(model.nameKey);
            } catch {
                return model.id;
            }
        },
        getModelDescriptionShort: (model: ModelDefinition | null | undefined): string => {
            if (!model?.descriptionShortKey) return '';
            try {
                return t(model.descriptionShortKey);
            } catch {
                return '';
            }
        },
    };
}
