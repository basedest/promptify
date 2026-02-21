import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from 'src/features/auth/login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'src/shared/ui/card';
import { AppTitle } from '~/src/shared/ui/app-title';

export async function LoginView() {
    const t = await getTranslations('auth');
    return (
        <div className="bg-muted flex min-h-screen flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <div className="flex items-center gap-2 self-center font-medium">
                    <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                        <MessageSquare className="size-4" />
                    </div>
                    <AppTitle />
                </div>
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">{t('loginTitle')}</CardTitle>
                        <CardDescription>{t('loginDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LoginForm />
                        <p className="text-muted-foreground mt-4 text-center text-sm">
                            {t('noAccount')}{' '}
                            <Link
                                href="/register"
                                className="text-primary font-medium underline-offset-4 hover:underline"
                            >
                                {t('signUp')}
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
