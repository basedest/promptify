import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { cookies, headers } from 'next/headers';
import { routing } from './routing';

const TIMEZONE_COOKIE = 'NEXT_TIMEZONE';
const FALLBACK_TIMEZONE = 'UTC';

function isValidTimezone(tz: string): boolean {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

async function getRequestTimeZone(): Promise<string> {
    const cookieStore = await cookies();
    const tzFromCookie = cookieStore.get(TIMEZONE_COOKIE)?.value;
    if (tzFromCookie && isValidTimezone(tzFromCookie)) return tzFromCookie;

    const headerStore = await headers();
    const tzFromHeader = headerStore.get('x-vercel-ip-timezone') ?? headerStore.get('x-timezone');
    if (tzFromHeader && isValidTimezone(tzFromHeader)) return tzFromHeader;

    return FALLBACK_TIMEZONE;
}

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

    const messages = (await import(`./locales/${locale}.json`)).default;
    const timeZone = await getRequestTimeZone();

    return {
        locale,
        messages,
        timeZone,
    };
});
