'use client';

import { createAuthClient } from 'better-auth/react';

// Better Auth handles client/server detection automatically.
// On the client side, baseURL is not needed (Better Auth detects it from the request).
// On the server side (SSR), Better Auth will read BETTER_AUTH_URL from process.env.
export const authClient = createAuthClient({
    baseURL: typeof window !== 'undefined' ? undefined : process.env.BETTER_AUTH_URL,
});
