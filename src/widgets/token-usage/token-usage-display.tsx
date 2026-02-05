'use client';

import { useTranslations } from 'next-intl';
import { trpc } from 'src/shared/api/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from 'src/shared/ui/card';

export function TokenUsageDisplay() {
    const t = useTranslations('chat');
    const { data: usage, isLoading } = trpc.tokenTracking.getUsage.useQuery(undefined, {
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    if (isLoading) {
        return null;
    }

    if (!usage) {
        return null;
    }

    const isNearLimit = usage.percentage >= 80;
    const isOverLimit = usage.percentage >= 100;

    return (
        <Card className="mx-4 mb-4">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('tokenUsage.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">{t('tokenUsage.today')}</span>
                    <span className={isOverLimit ? 'text-destructive font-semibold' : 'font-medium'}>
                        {usage.used.toLocaleString()} / {usage.limit.toLocaleString()}
                    </span>
                </div>
                <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                    <div
                        className={`h-full transition-all duration-300 ${
                            isOverLimit ? 'bg-destructive' : isNearLimit ? 'bg-warning' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, usage.percentage)}%` }}
                    />
                </div>
                {usage.remaining > 0 ? (
                    <p className="text-muted-foreground text-xs">
                        {t('tokenUsage.remaining', { count: usage.remaining.toLocaleString() })}
                    </p>
                ) : (
                    <p className="text-destructive text-xs">{t('tokenUsage.quotaExceeded')}</p>
                )}
            </CardContent>
        </Card>
    );
}
