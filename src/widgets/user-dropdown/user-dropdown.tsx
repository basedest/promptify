'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronUp, LogOut, User } from 'lucide-react';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { cn } from 'src/shared/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from 'src/shared/ui/dropdown-menu';
import { ThemeToggle } from 'src/features/theme/toggle-theme';

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

    if (isPending || !session) {
        return null;
    }

    const displayName = session.user.name?.trim() || session.user.email;
    const email = session.user.email ?? '';
    const image = session.user.image;
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
                <button
                    type="button"
                    className="over:bg-muted/50 focus:ring-ring flex h-14 w-full items-center gap-3 rounded-lg p-3 text-left transition-colors focus:ring-2 focus:outline-none"
                    aria-label={t('userMenuLabel')}
                >
                    <span
                        className={cn(
                            'bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-medium',
                            !image && 'text-muted-foreground',
                        )}
                    >
                        {image ? (
                            <Image
                                src={image}
                                alt=""
                                width={36}
                                height={36}
                                className="aspect-square size-full object-cover"
                            />
                        ) : (
                            initials
                        )}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{displayName}</p>
                        <p className="text-muted-foreground truncate text-xs">{email}</p>
                    </div>
                    <ChevronUp className="text-muted-foreground size-4 shrink-0" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3 p-1">
                        <span
                            className={cn(
                                'bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-medium',
                                !image && 'text-muted-foreground',
                            )}
                        >
                            {image ? (
                                <Image
                                    src={image}
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="aspect-square size-full object-cover"
                                />
                            ) : (
                                initials
                            )}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{displayName}</p>
                            <p className="text-muted-foreground truncate text-xs">{email}</p>
                        </div>
                    </div>
                </DropdownMenuLabel>
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
