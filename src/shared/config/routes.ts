/**
 * Route protection config.
 * Routes under app/(protected)/ require authentication; all others are public.
 * Public routes: /, /login, /register, /api/auth/*
 */

export const LOGIN_PATH = '/login' as const;

/** Path prefixes that are always public (no auth required). */
export const PUBLIC_PATH_PREFIXES: readonly string[] = ['/api/auth', '/login', '/register'];

/** Paths that are exactly public (exact match). */
export const PUBLIC_PATHS: readonly string[] = ['/'];

/**
 * Returns true if the pathname is a public route (no auth required).
 */
export function isPublicPath(pathname: string): boolean {
    if (PUBLIC_PATHS.includes(pathname)) return true;
    return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}
