import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { RegisterForm } from 'src/features/auth/register';

export async function RegisterView() {
    const t = await getTranslations('auth');
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
            <div className="flex w-full max-w-sm flex-col gap-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">{t('registerTitle')}</h1>
                <p className="text-muted-foreground text-sm">{t('registerDescription')}</p>
            </div>
            <RegisterForm />
            <p className="text-muted-foreground text-center text-sm">
                {t('hasAccount')}{' '}
                <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
                    {t('signIn')}
                </Link>
            </p>
        </div>
    );
}
