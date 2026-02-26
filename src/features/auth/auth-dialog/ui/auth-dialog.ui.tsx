'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { getLegalLinks } from 'src/shared/lib/legal-links';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'src/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/shared/ui/tabs';
import { LoginForm } from 'src/features/auth/login';
import { RegisterForm } from 'src/features/auth/register';
import { GoogleSignInButton } from 'src/features/auth/social-login';
import { useAuthDialog } from '../model/auth-dialog.model';
import { CheckEmailView } from './check-email-view';

function OrSeparator({ label }: { label: string }) {
    return (
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
                <span className="bg-background text-muted-foreground px-2">{label}</span>
            </div>
        </div>
    );
}

export function AuthDialog() {
    const t = useTranslations('auth');
    const router = useRouter();
    const legal = getLegalLinks(useLocale());
    const { open, defaultTab, close, checkEmailFor, showCheckEmail, backFromCheckEmail } = useAuthDialog();

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{checkEmailFor ? t('checkEmailTitle') : t('signInOrSignUp')}</DialogTitle>
                </DialogHeader>
                {checkEmailFor ? (
                    <CheckEmailView email={checkEmailFor} onBack={backFromCheckEmail} />
                ) : (
                    <Tabs key={defaultTab} defaultValue={defaultTab}>
                        <TabsList className="w-full">
                            <TabsTrigger value="signin" className="flex-1">
                                {t('signIn')}
                            </TabsTrigger>
                            <TabsTrigger value="signup" className="flex-1">
                                {t('createAccount')}
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="signin" className="flex flex-col gap-4 pt-4">
                            <GoogleSignInButton />
                            <OrSeparator label={t('orContinueWith')} />
                            <LoginForm
                                onSuccess={() => {
                                    close();
                                    router.refresh();
                                }}
                                onEmailVerificationRequired={showCheckEmail}
                            />
                        </TabsContent>
                        <TabsContent value="signup" className="flex flex-col gap-4 pt-4">
                            <GoogleSignInButton />
                            <OrSeparator label={t('orContinueWith')} />
                            <RegisterForm />
                            <p className="text-muted-foreground text-center text-xs">
                                {t('agreeToTerms')}{' '}
                                <Link href={legal.terms} className="hover:text-primary underline underline-offset-4">
                                    {t('termsOfService')}
                                </Link>{' '}
                                {t('and')}{' '}
                                <Link
                                    href={legal.privacyPolicy}
                                    className="hover:text-primary underline underline-offset-4"
                                >
                                    {t('privacyPolicy')}
                                </Link>
                                .
                            </p>
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
