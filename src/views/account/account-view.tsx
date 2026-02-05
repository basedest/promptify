'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { trpc } from 'src/shared/api/trpc/client';
import { Button } from 'src/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'src/shared/ui/card';

function formatResetDate(date: Date): string {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
    }).format(new Date(date));
}

export function AccountView() {
    const t = useTranslations('account');
    const { data: quotas, isLoading } = trpc.tokenTracking.getAccountQuotas.useQuery();

    return (
        <div className="flex min-h-screen flex-col gap-8 p-6">
            <div className="mx-auto w-full max-w-2xl space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
                    <Button asChild variant="outline">
                        <Link href="/">{t('backToChat')}</Link>
                    </Button>
                </div>

                {isLoading && (
                    <p className="text-muted-foreground text-sm">{t('loading')}</p>
                )}
                {!isLoading && quotas && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">
                                    {t('tokenUsage.title')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-baseline justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t('tokenUsage.used', {
                                            used: quotas.token.used.toLocaleString(),
                                            limit: quotas.token.limit.toLocaleString(),
                                        })}
                                    </span>
                                    {quotas.token.remaining > 0 && (
                                        <span className="text-muted-foreground text-xs">
                                            {t('tokenUsage.remaining', {
                                                count: quotas.token.remaining.toLocaleString(),
                                            })}
                                        </span>
                                    )}
                                </div>
                                <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                                    <div
                                        className={`h-full transition-all duration-300 ${
                                            quotas.token.remaining <= 0
                                                ? 'bg-destructive'
                                                : quotas.token.used / quotas.token.limit >= 0.8
                                                  ? 'bg-amber-500'
                                                  : 'bg-primary'
                                        }`}
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                (quotas.token.used / quotas.token.limit) * 100,
                                            )}%`,
                                        }}
                                    />
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    {quotas.token.remaining <= 0
                                        ? t('tokenUsage.quotaExceeded')
                                        : t('tokenUsage.resetsAt', {
                                              date: formatResetDate(quotas.token.resetAt),
                                          })}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">
                                    {t('conversationUsage.title')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-baseline justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t('conversationUsage.used', {
                                            count: quotas.conversation.count,
                                            limit: quotas.conversation.limit,
                                        })}
                                    </span>
                                    {quotas.conversation.remaining > 0 && (
                                        <span className="text-muted-foreground text-xs">
                                            {t('conversationUsage.remaining', {
                                                count: quotas.conversation.remaining,
                                            })}
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
