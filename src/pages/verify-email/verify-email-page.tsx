'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'src/shared/ui/card';
import { Button } from 'src/shared/ui/button';
import { Input } from 'src/shared/ui/input';
import { Label } from 'src/shared/ui/label';
import { Alert, AlertDescription } from 'src/shared/ui/alert';
import { resendVerificationEmail } from 'src/features/auth/send-verification/resend-verification';

type VerifyEmailPageProps = {
    maskedEmail: string | null;
};

export function VerifyEmailPage({ maskedEmail }: VerifyEmailPageProps) {
    const t = useTranslations('auth');

    const [resendEmail, setResendEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [resendError, setResendError] = useState('');

    const hasSession = maskedEmail !== null;

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasSession && !resendEmail.trim()) return;
        setResendLoading(true);
        setResendError('');
        setResendSuccess(false);
        try {
            if (hasSession) {
                const result = await resendVerificationEmail();
                if (result.ok) {
                    setResendSuccess(true);
                } else {
                    setResendError(
                        result.error === 'session_required'
                            ? t('resendVerificationSessionRequired')
                            : t('resendVerificationFailed'),
                    );
                }
            } else {
                const { error } = await (
                    authClient.sendVerificationEmail as (opts: {
                        email: string;
                        callbackURL?: string;
                    }) => Promise<{ error?: { message?: string } }>
                )({
                    email: resendEmail.trim(),
                    callbackURL: '/',
                });
                if (error) {
                    setResendError(error.message ?? t('resendVerificationFailed'));
                } else {
                    setResendSuccess(true);
                }
            }
        } catch {
            setResendError(t('resendVerificationFailed'));
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">{t('checkEmailTitle')}</CardTitle>
                <CardDescription>
                    {maskedEmail !== null
                        ? t('checkEmailDescriptionWithMask', { maskedEmail })
                        : t('checkEmailDescription')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <form onSubmit={handleResend} className="space-y-3">
                    {!hasSession && (
                        <div className="space-y-2">
                            <Label htmlFor="resend-email">{t('email')}</Label>
                            <Input
                                id="resend-email"
                                type="email"
                                placeholder={t('emailPlaceholder')}
                                value={resendEmail}
                                onChange={(e) => setResendEmail(e.target.value)}
                                required={!hasSession}
                            />
                        </div>
                    )}
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
                <Button asChild className="w-full">
                    <Link href="/login">{t('signIn')}</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
