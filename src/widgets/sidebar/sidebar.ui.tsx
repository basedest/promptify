'use client';

import * as React from 'react';

import { SidebarDropdown } from './ui/sidebar-dropdown.ui';
import { AppSidebarHeader } from './ui/sidebar-header.ui';
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail } from 'src/shared/ui/sidebar';
import { SidebarChats } from './ui/sidebar-chats.ui';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <AppSidebarHeader />
            <SidebarContent>
                <SidebarChats />
            </SidebarContent>
            <SidebarFooter>
                <SidebarDropdown />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
