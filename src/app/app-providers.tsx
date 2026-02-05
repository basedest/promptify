'use client';

import { NextIntlClientProvider } from 'next-intl';
import { TRPCProvider } from 'src/shared/api/trpc/provider';

type AppProvidersProps = {
    children: React.ReactNode;
    locale: string;
    messages?: Awaited<ReturnType<typeof import('next-intl/server').getMessages>>;
};

export function AppProviders({ children, locale, messages }: AppProvidersProps) {
    return (
        <TRPCProvider>
            <NextIntlClientProvider locale={locale} messages={messages ?? undefined}>
                {children}
            </NextIntlClientProvider>
        </TRPCProvider>
    );
}
