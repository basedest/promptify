'use server';

import { cookies, headers } from 'next/headers';
import { getServerConfig } from 'src/shared/config/env';
import { getSession } from 'src/shared/backend/auth/auth.server';

export async function resendVerificationEmail(): Promise<{ ok: true } | { ok: false; error: string }> {
    const session = await getSession(await headers());
    if (!session?.user?.email) {
        return { ok: false, error: 'session_required' };
    }

    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const baseURL = getServerConfig().auth.baseUrl;

    const res = await fetch(`${baseURL}/api/auth/send-verification-email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: cookieHeader,
        },
        body: JSON.stringify({
            email: session.user.email,
            callbackURL: '/',
        }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { message?: string })?.message ?? 'resend_failed';
        return { ok: false, error: message };
    }

    return { ok: true };
}
