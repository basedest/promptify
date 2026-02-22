import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { RegisterForm } from 'src/features/auth/register';
import { GoogleSignInButton } from 'src/features/auth/social-login';
import { getServerConfig } from 'src/shared/config/env';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'src/shared/ui/card';
import { AppTitle } from '~/src/shared/ui/app-title';
import { YappLogo } from '~/src/shared/ui/yapp-logo';

export async function RegisterView() {
    const t = await getTranslations('auth');
    const config = getServerConfig();

    return (
        <div className="bg-muted flex min-h-screen flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <div className="flex items-center gap-2 self-center font-medium">
                    <YappLogo size={24} className="text-primary shrink-0" />
                    <AppTitle />
                </div>
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">{t('registerTitle')}</CardTitle>
                        <CardDescription>{t('registerDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {config.auth.google && (
                            <>
                                <GoogleSignInButton />
                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="bg-card text-muted-foreground px-2">
                                            {t('orContinueWith')}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                        <RegisterForm />
                        <p className="text-muted-foreground mt-4 text-center text-sm">
                            {t('hasAccount')}{' '}
                            <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
                                {t('signIn')}
                            </Link>
                        </p>
                    </CardContent>
                </Card>
                <p className="text-muted-foreground text-center text-xs">
                    By creating an account you agree to our{' '}
                    <Link href="/terms" className="hover:text-primary underline underline-offset-4">
                        {t('termsOfService')}
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy-policy" className="hover:text-primary underline underline-offset-4">
                        {t('privacyPolicy')}
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
}
