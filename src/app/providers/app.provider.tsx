'use client';

import { NextIntlClientProvider } from 'next-intl';
import { TRPCProvider } from './api.provider';
import { ThemeProvider } from './theme.provider';
import { SidebarProvider } from 'src/shared/ui/sidebar';

type AppProviderProps = {
    children: React.ReactNode;
    locale: string;
    messages?: Awaited<ReturnType<typeof import('next-intl/server').getMessages>>;
};

export function AppProvider({ children, locale, messages }: AppProviderProps) {
    return (
        <TRPCProvider>
            <NextIntlClientProvider locale={locale} messages={messages ?? undefined}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
                </ThemeProvider>
            </NextIntlClientProvider>
        </TRPCProvider>
    );
}
