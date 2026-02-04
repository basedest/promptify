'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { authClient } from 'src/shared/lib/auth-client';
import { Button } from 'src/shared/ui/button';
import { Input } from 'src/shared/ui/input';
import { Label } from 'src/shared/ui/label';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
    const t = useTranslations('auth');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            setError(t('registrationFailed'));
            return;
        }
        if (!EMAIL_REGEX.test(trimmedEmail)) {
            setError(t('registrationFailed'));
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(t('registrationFailed'));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('passwordsDoNotMatch'));
            return;
        }

        setIsLoading(true);
        const { data, error: signUpError } = await authClient.signUp.email(
            {
                email: trimmedEmail,
                name: trimmedEmail,
                password,
                callbackURL: '/',
            },
            {
                onSuccess: () => {
                    window.location.href = '/';
                },
            },
        );

        setIsLoading(false);

        if (signUpError || !data) {
            setError(t('registrationFailed'));
            return;
        }

        window.location.href = '/';
    }

    return (
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="register-email">{t('email')}</Label>
                <Input
                    id="register-email"
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
                <Label htmlFor="register-password">{t('password')}</Label>
                <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    aria-invalid={!!error}
                />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="register-confirm-password">{t('confirmPassword')}</Label>
                <Input
                    id="register-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isLoading ? t('creatingAccount') : t('createAccount')}
            </Button>
        </form>
    );
}
