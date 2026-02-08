'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, LogOut, User } from 'lucide-react';
import { authClient } from 'src/shared/lib/auth/auth.client';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from 'src/shared/ui/dropdown-menu';
import { ThemeToggle } from 'src/features/theme/toggle-theme';
import { SidebarMenuButton, useSidebar } from 'src/shared/ui/sidebar';
import { Avatar } from 'src/shared/ui/avatar';
import { AvatarImage } from 'src/shared/ui/avatar';
import { AvatarFallback } from 'src/shared/ui/avatar';

function getInitials(name: string | null | undefined, email: string): string {
    if (name?.trim()) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.trim().slice(0, 2).toUpperCase();
    }
    if (email) {
        return email.slice(0, 2).toUpperCase();
    }
    return '?';
}

export function UserDropdown() {
    const t = useTranslations('account');
    const tAuth = useTranslations('auth');
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();
    const { isMobile } = useSidebar();

    if (isPending || !session) {
        return null;
    }

    const displayName = session.user.name?.trim() || session.user.email;
    const email = session.user.email ?? '';
    const image = session.user.image ?? '';
    const initials = getInitials(session.user.name, email);

    async function handleLogout() {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push('/login');
                    router.refresh();
                },
            },
        });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    aria-label={t('userMenuLabel')}
                >
                    <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={image} alt={displayName ?? ''} />
                        <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{displayName}</span>
                        <span className="truncate text-xs">{email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
            >
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarImage src={image} alt={displayName ?? ''} />
                            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">{displayName}</span>
                            <span className="truncate text-xs">{email}</span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/account" className="flex cursor-pointer items-center gap-2">
                        <User className="size-4" />
                        {t('title')}
                    </Link>
                </DropdownMenuItem>
                <ThemeToggle />
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className="flex items-center gap-2">
                    <LogOut className="size-4" />
                    {tAuth('signOut')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
