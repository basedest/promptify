import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from 'src/shared/backend/auth/auth.server';
import { logger } from 'src/shared/backend/logger';
import { getBackendContainer, CHAT_STREAM_USE_CASE } from 'src/shared/backend/container';
import {
    ConversationNotFoundError,
    ForbiddenError,
    RateLimitExceededError,
    QuotaExceededError,
    ValidationError,
} from 'src/shared/backend/use-cases/errors';
import type { ChatStreamUseCase } from 'src/shared/backend/use-cases/chat-stream.use-case';

const requestSchema = z.object({
    conversationId: z.cuid(),
    content: z.string().min(1).max(4000),
});

function jsonResponse(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const body = await request.json();
        const parseResult = requestSchema.safeParse(body);
        if (!parseResult.success) {
            return jsonResponse({ error: 'Invalid request', details: parseResult.error.issues }, 400);
        }

        const { conversationId, content } = parseResult.data;
        const container = getBackendContainer();
        const useCase = container.resolve<ChatStreamUseCase>(CHAT_STREAM_USE_CASE);

        const stream = await useCase.execute({
            userId: session.user.id,
            conversationId,
            content,
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        if (error instanceof ConversationNotFoundError) {
            return jsonResponse({ error: error.message }, 404);
        }
        if (error instanceof ForbiddenError) {
            return jsonResponse({ error: error.message }, 403);
        }
        if (error instanceof RateLimitExceededError) {
            return jsonResponse({ error: error.message }, 429);
        }
        if (error instanceof QuotaExceededError) {
            return jsonResponse({ error: error.message }, 403);
        }
        if (error instanceof ValidationError) {
            return jsonResponse({ error: error.message }, 400);
        }

        logger.error({ error }, 'Streaming request failed');
        return jsonResponse({ error: 'Internal server error' }, 500);
    }
}
