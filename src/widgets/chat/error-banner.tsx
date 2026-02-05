'use client';

import { useTranslations } from 'next-intl';

type ErrorBannerProps = {
    error: 'network' | 'quota' | 'rateLimit' | 'session' | 'conversationLimit' | null;
    onDismiss?: () => void;
};

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
    const t = useTranslations('chat.errors');

    if (!error) return null;

    const errorMessages = {
        network: t('network'),
        quota: t('quota'),
        rateLimit: t('rateLimit'),
        session: t('session'),
        conversationLimit: t('conversationLimit'),
    };

    return (
        <div className="bg-destructive/10 border-destructive/50 flex items-center justify-between border-b px-4 py-3">
            <p className="text-destructive text-sm">{errorMessages[error]}</p>
            {onDismiss && (
                <button onClick={onDismiss} className="text-destructive/70 hover:text-destructive text-sm font-medium">
                    {t('dismiss')}
                </button>
            )}
        </div>
    );
}
