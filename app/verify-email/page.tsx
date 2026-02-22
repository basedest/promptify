import { headers } from 'next/headers';
import { getSession } from 'src/shared/backend/auth/auth.server';
import { maskEmail } from 'src/shared/lib/mask-email';
import { VerifyEmailPage } from 'src/pages/verify-email/verify-email-page';

export default async function Page() {
    const session = await getSession(await headers());
    const email = session?.user?.email;
    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <VerifyEmailPage maskedEmail={email ? maskEmail(email) : null} />
        </main>
    );
}
