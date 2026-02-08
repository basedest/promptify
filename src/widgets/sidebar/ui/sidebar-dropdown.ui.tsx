'use client';

import { SidebarMenu, SidebarMenuItem } from 'src/shared/ui/sidebar';
import { UserDropdown } from 'src/widgets/user-dropdown/user-dropdown';

export function SidebarDropdown() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <UserDropdown />
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
