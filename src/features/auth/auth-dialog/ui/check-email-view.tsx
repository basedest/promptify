'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { Button } from 'src/shared/ui/button';
import { Alert, AlertDescription } from 'src/shared/ui/alert';
import { maskEmail } from 'src/shared/lib/mask-email';

type CheckEmailViewProps = {
    email: string;
    onBack: () => void;
};

export function CheckEmailView({ email, onBack }: CheckEmailViewProps) {
    const t = useTranslations('auth');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [resendError, setResendError] = useState('');

    const maskedEmail = maskEmail(email);

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault();
        setResendLoading(true);
        setResendError('');
        setResendSuccess(false);
        try {
            const { error } = await (
                authClient.sendVerificationEmail as (opts: {
                    email: string;
                    callbackURL?: string;
                }) => Promise<{ error?: { message?: string } }>
            )({
                email,
                callbackURL: '/',
            });
            if (error) {
                setResendError(error.message ?? t('resendVerificationFailed'));
            } else {
                setResendSuccess(true);
            }
        } catch {
            setResendError(t('resendVerificationFailed'));
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">{t('checkEmailDescriptionWithMask', { maskedEmail })}</p>
            <form onSubmit={handleResend} className="space-y-3">
                {resendSuccess && (
                    <Alert>
                        <AlertDescription>{t('resendVerificationSuccess')}</AlertDescription>
                    </Alert>
                )}
                {resendError && (
                    <Alert variant="destructive">
                        <AlertDescription>{resendError}</AlertDescription>
                    </Alert>
                )}
                <Button type="submit" variant="secondary" className="w-full" disabled={resendLoading}>
                    {resendLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('resendVerification')}
                        </>
                    ) : (
                        t('resendVerification')
                    )}
                </Button>
            </form>
            <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
                {t('signIn')}
            </Button>
        </div>
    );
}
