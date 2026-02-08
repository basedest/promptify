import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from 'src/shared/backend/auth/auth.server';
import { LOGIN_PATH } from 'src/shared/config/routes';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession(await headers());
    if (!session) {
        redirect(LOGIN_PATH);
    }
    return <>{children}</>;
}
