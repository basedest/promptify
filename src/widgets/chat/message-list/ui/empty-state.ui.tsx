'use client';

import { useTranslations } from 'next-intl';

export function EmptyState() {
    const t = useTranslations('chat');

    return (
        <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
                <h3 className="mb-2 text-lg font-semibold">{t('emptyState.title')}</h3>
                <p className="text-muted-foreground mb-4 text-sm">{t('emptyState.description')}</p>
                <p className="text-muted-foreground text-xs">{t('emptyState.hint')}</p>
            </div>
        </div>
    );
}
