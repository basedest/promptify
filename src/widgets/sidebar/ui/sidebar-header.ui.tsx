'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
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

export function AppSidebarHeader() {
    const { open } = useSidebar();
    const t = useTranslations('sidebar');
    const { handleNewChat } = useChats();

    return (
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => {
                            handleNewChat();
                        }}
                        tooltip={t('openSidebar')}
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                        {open ? (
                            <>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate text-lg font-bold">Promptify</span>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <SidebarTrigger />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" align="center">
                                        {t('closeSidebar')}
                                    </TooltipContent>
                                </Tooltip>
                            </>
                        ) : (
                            <SidebarTrigger className="mx-auto" />
                        )}
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
    );
}
