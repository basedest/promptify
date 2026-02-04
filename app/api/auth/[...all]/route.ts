import { toNextJsHandler } from 'better-auth/next-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from 'src/shared/lib/auth';
import { logger } from 'src/shared/lib/logger';

const handler = toNextJsHandler(auth);

async function withAuthErrorLogging(fn: (req: Request) => Promise<Response>, req: NextRequest): Promise<Response> {
    try {
        return await fn(req);
    } catch (err) {
        logger.error({ err, route: '/api/auth' }, 'Auth API error');
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    // Next.js route handler signature requires second param
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: { params: Promise<Record<string, string | string[]>> },
): Promise<Response> {
    return withAuthErrorLogging(handler.GET, req);
}

export async function POST(
    req: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: { params: Promise<Record<string, string | string[]>> },
): Promise<Response> {
    return withAuthErrorLogging(handler.POST, req);
}
