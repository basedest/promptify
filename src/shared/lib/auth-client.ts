'use client';

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
    baseURL: typeof window !== 'undefined' ? undefined : process.env.BETTER_AUTH_URL,
});
