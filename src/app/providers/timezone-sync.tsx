'use client';

import { useEffect } from 'react';

const TIMEZONE_COOKIE = 'NEXT_TIMEZONE';
const MAX_AGE_YEAR = 60 * 60 * 24 * 365;

/**
 * Sets the NEXT_TIMEZONE cookie from the browser so the server can use it
 * in next-intl (getRequestConfig). Runs once on mount.
 */
export function TimezoneSync() {
    useEffect(() => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!tz) return;
        const value = encodeURIComponent(tz);
        document.cookie = `${TIMEZONE_COOKIE}=${value};path=/;max-age=${MAX_AGE_YEAR};SameSite=Lax`;
    }, []);
    return null;
}
