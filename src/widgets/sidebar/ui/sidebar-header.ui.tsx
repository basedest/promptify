'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
    useSidebar,
} from 'src/shared/ui/sidebar';
import { Tooltip, TooltipTrigger, TooltipContent } from 'src/shared/ui/tooltip';
import { useChats } from 'src/entities/chat';
import { AppTitle } from '~/src/shared/ui/app-title';

export function AppSidebarHeader() {
    const { open } = useSidebar();
    const t = useTranslations('sidebar');
    const router = useRouter();
    const { handleNewChat } = useChats();

    return (
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => {
                            handleNewChat();
                            router.push('/');
                        }}
                        tooltip={t('openSidebar')}
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                        {open ? (
                            <>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <AppTitle />
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <SidebarTrigger onClick={(event) => event.stopPropagation()} />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" align="center">
                                        {t('closeSidebar')}
                                    </TooltipContent>
                                </Tooltip>
                            </>
                        ) : (
                            <SidebarTrigger className="mx-auto" onClick={(event) => event.stopPropagation()} />
                        )}
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
    );
}
