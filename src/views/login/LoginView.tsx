import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from 'src/features/auth/login';

export async function LoginView() {
    const t = await getTranslations('auth');
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
            <div className="flex w-full max-w-sm flex-col gap-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">{t('loginTitle')}</h1>
                <p className="text-muted-foreground text-sm">{t('loginDescription')}</p>
            </div>
            <LoginForm />
            <p className="text-muted-foreground text-center text-sm">
                {t('noAccount')}{' '}
                <Link href="/register" className="text-primary font-medium underline-offset-4 hover:underline">
                    {t('signUp')}
                </Link>
            </p>
        </div>
    );
}
