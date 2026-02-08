'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { Button } from 'src/shared/ui/button';

type LogoutButtonProps = {
    callbackURL?: string;
    children?: React.ReactNode;
    className?: string;
};

export function LogoutButton({ callbackURL = '/', children, className }: LogoutButtonProps) {
    const t = useTranslations('auth');
    const router = useRouter();

    async function handleClick() {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push(callbackURL);
                    router.refresh();
                },
            },
        });
    }

    return (
        <Button type="button" variant="outline" onClick={handleClick} className={className}>
            {children ?? t('signOut')}
        </Button>
    );
}
