import { headers } from 'next/headers';
import Link from 'next/link';
import { getSession } from 'src/shared/backend/auth/auth.server';
import { LogoutButton } from 'src/features/auth/logout';

export default async function DashboardPage() {
    const session = await getSession(await headers());
    if (!session) return null; // layout already redirects; this satisfies type

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground text-sm">Signed in as {session.user.email}</p>
            </div>
            <div className="flex gap-4">
                <LogoutButton />
                <Link
                    href="/"
                    className="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md border bg-transparent px-4 py-2 text-sm font-medium shadow-xs"
                >
                    Home
                </Link>
            </div>
        </div>
    );
}
