'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { trpc } from 'src/shared/api/trpc/client';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { setLocaleCookie } from 'src/shared/lib/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/shared/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'src/shared/ui/card';
import { Button } from 'src/shared/ui/button';
import { Input } from 'src/shared/ui/input';
import { Skeleton } from 'src/shared/ui/skeleton';
import { useFavoriteModels } from 'src/entities/model';
import { ModelBadge } from 'src/entities/model';

function formatResetTime(date: Date): string {
    return new Intl.DateTimeFormat(undefined, {
        timeStyle: 'short',
        timeZone: 'UTC',
    }).format(new Date(date));
}

function formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'long',
    }).format(new Date(date));
}

function AccountSection() {
    const t = useTranslations('settings.account');
    const tAuth = useTranslations('auth');
    const router = useRouter();
    const { data: session } = authClient.useSession();
    const [displayName, setDisplayName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (session?.user?.name) {
            setDisplayName(session.user.name);
        }
    }, [session?.user?.name]);

    const handleSave = async () => {
        if (!displayName.trim()) return;
        setIsSaving(true);
        try {
            await authClient.updateUser({ name: displayName.trim() });
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    if (!session) return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{t('email')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">{session.user.email}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{t('displayName')}</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="max-w-xs" />
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || displayName.trim() === (session.user.name ?? '')}
                    >
                        {isSaving ? t('saving') : t('save')}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{t('memberSince')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">{formatDate(session.user.createdAt)}</p>
                </CardContent>
            </Card>

            <Button
                variant="outline"
                onClick={async () => {
                    await authClient.signOut({
                        fetchOptions: {
                            onSuccess: () => {
                                router.push('/login');
                                router.refresh();
                            },
                        },
                    });
                }}
            >
                {tAuth('signOut')}
            </Button>
        </div>
    );
}

function UsageSection() {
    const t = useTranslations('settings.usage');
    const { data: quotas, isLoading } = trpc.tokenTracking.getAccountQuotas.useQuery();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader className="pb-3">
                        <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-full rounded-full" />
                        <Skeleton className="h-3 w-40" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <Skeleton className="h-4 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!quotas) return null;

    const percentage = Math.round(quotas.usage.percentage);
    const barColor = quotas.usage.exceeded
        ? 'bg-destructive'
        : percentage > 80
          ? 'bg-amber-500'
          : percentage > 60
            ? 'bg-yellow-500'
            : 'bg-emerald-500';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{t('dailyQuota')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="bg-secondary h-3 w-full overflow-hidden rounded-full">
                        <div
                            className={`h-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                    </div>
                    <p className="text-sm">
                        {quotas.usage.exceeded ? t('quotaExceeded') : t('quotaUsed', { percentage })}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {t('resetsAt', { time: formatResetTime(quotas.usage.resetAt) })}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{t('conversations')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    <p className="text-sm">
                        {t('conversationsUsed', {
                            count: quotas.conversation.count,
                            limit: quotas.conversation.limit,
                        })}
                    </p>
                    {quotas.conversation.remaining > 0 && (
                        <p className="text-muted-foreground text-xs">
                            {t('conversationsRemaining', { count: quotas.conversation.remaining })}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function CustomizationSection() {
    const t = useTranslations('settings.customization');
    const tTheme = useTranslations('theme');
    const tLang = useTranslations('language');
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();
    const currentLocale = useLocale();
    const router = useRouter();
    const { data: session } = authClient.useSession();
    const setLocale = trpc.user.setLocale.useMutation();
    const { favorites, toggleFavorite } = useFavoriteModels();
    const { data: allModels = [] } = trpc.models.list.useQuery(undefined, {
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const handleLocaleChange = (newLocale: string) => {
        setLocaleCookie(newLocale);
        if (session) {
            setLocale.mutate({ locale: newLocale as 'en' | 'ru' });
        }
        router.refresh();
    };

    const themes = [
        { value: 'light', label: tTheme('light'), icon: Sun },
        { value: 'dark', label: tTheme('dark'), icon: Moon },
        { value: 'system', label: tTheme('system'), icon: Monitor },
    ] as const;

    const locales = [
        { value: 'en', label: tLang('en') },
        { value: 'ru', label: tLang('ru') },
    ] as const;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{t('theme')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {mounted && (
                        <div className="flex gap-2">
                            {themes.map(({ value, label, icon: Icon }) => (
                                <Button
                                    key={value}
                                    variant={theme === value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setTheme(value)}
                                    className="gap-1.5"
                                >
                                    <Icon className="size-4" />
                                    {label}
                                </Button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{t('language')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        {locales.map(({ value, label }) => (
                            <Button
                                key={value}
                                variant={currentLocale === value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleLocaleChange(value)}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{t('favoriteModels')}</CardTitle>
                    <CardDescription>{t('favoriteModelsDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {favorites.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{t('noFavorites')}</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {favorites.map((model) => (
                                <div
                                    key={model.id}
                                    className="bg-secondary flex items-center gap-1.5 rounded-md px-2.5 py-1"
                                >
                                    <ModelBadge modelId={model.id} />
                                    <button
                                        type="button"
                                        onClick={() => toggleFavorite(model.id)}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {favorites.length < allModels.length && (
                        <p className="text-muted-foreground mt-2 text-xs">
                            {allModels.length - favorites.length} more models available in the chat selector.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export function SettingsView() {
    const t = useTranslations('settings');

    return (
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
            <div className="mx-auto w-full max-w-2xl space-y-8">
                <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>

                <Tabs defaultValue="account">
                    <TabsList>
                        <TabsTrigger value="account">{t('tabs.account')}</TabsTrigger>
                        <TabsTrigger value="usage">{t('tabs.usage')}</TabsTrigger>
                        <TabsTrigger value="customization">{t('tabs.customization')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="account" className="mt-6">
                        <AccountSection />
                    </TabsContent>
                    <TabsContent value="usage" className="mt-6">
                        <UsageSection />
                    </TabsContent>
                    <TabsContent value="customization" className="mt-6">
                        <CustomizationSection />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
