'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { Button } from 'src/shared/ui/button';
import { Input } from 'src/shared/ui/input';
import { Label } from 'src/shared/ui/label';

type LoginFormProps = {
    onSuccess?: () => void;
    /** Called when sign-in fails due to unverified email (403). Receives the email for the check-email flow. */
    onEmailVerificationRequired?: (email: string) => void;
};

export function LoginForm({ onSuccess, onEmailVerificationRequired }: LoginFormProps = {}) {
    const t = useTranslations('auth');
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            setError(t('invalidCredentials'));
            return;
        }

        setIsLoading(true);
        const { data, error: signInError } = await authClient.signIn.email({
            email: trimmedEmail,
            password,
            callbackURL: '/',
        });

        setIsLoading(false);

        if (signInError || !data) {
            const status = (signInError as { status?: number } | null)?.status;
            if (status === 403 && onEmailVerificationRequired) {
                onEmailVerificationRequired(trimmedEmail);
                return;
            }
            setError(status === 403 ? t('emailVerificationRequired') : t('invalidCredentials'));
            return;
        }

        if (onSuccess) {
            onSuccess();
        } else {
            router.push('/');
        }
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="login-email">{t('email')}</Label>
                <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    aria-invalid={!!error}
                />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="login-password">{t('password')}</Label>
                <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    aria-invalid={!!error}
                />
            </div>
            {error && (
                <p className="text-destructive text-sm" role="alert">
                    {error}
                </p>
            )}
            <Button type="submit" disabled={isLoading}>
                {isLoading ? t('signingIn') : t('signIn')}
            </Button>
        </form>
    );
}
