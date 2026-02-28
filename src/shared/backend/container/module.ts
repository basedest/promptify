import 'server-only';
import { getServerConfig } from 'src/shared/config/env';
import { prisma } from 'src/shared/backend/prisma';
import { Container } from './container';
import {
    CACHE_SERVICE,
    CHAT_CLIENT,
    RATE_LIMITER,
    TOKEN_TRACKER,
    PII_DETECTION_SERVICE,
    PII_DETECTION_REPOSITORY,
    PII_DETECTION_COST_TRACKER,
    MESSAGE_REPOSITORY,
    CHAT_STREAM_USE_CASE,
    SEND_MESSAGE_USE_CASE,
} from './tokens';
import { redisClient } from 'src/shared/backend/redis';
import { RedisCacheService, NoopCacheService, type ICacheService } from 'src/shared/backend/cache';
import type { IChatClient } from 'src/shared/backend/ports';
import { OpenRouterClient } from 'src/shared/backend/openrouter/client';
import { RateLimiter } from 'src/shared/backend/rate-limit/service';
import { TokenTrackingService } from 'src/shared/backend/token-tracking/service';
import { PiiDetectionService } from 'src/shared/backend/pii-detection/service';
import { PiiMasker, PiiDetectionRepository, PiiDetectionCostTracker } from 'src/shared/backend/pii-detection';
import { MessageRepository } from 'src/shared/backend/repositories/message.repository';
import { ChatStreamUseCase } from 'src/shared/backend/use-cases/chat-stream.use-case';
import { SendMessageUseCase } from 'src/shared/backend/use-cases/send-message.use-case';

/**
 * Create and configure the backend DI container.
 * Wires all providers with lazy singleton resolution.
 */
function createBackendContainer(): Container {
    const config = getServerConfig();
    const container = new Container();

    container
        .register<ICacheService>(CACHE_SERVICE, () =>
            redisClient ? new RedisCacheService(redisClient) : new NoopCacheService(),
        )
        .register(CHAT_CLIENT, () => new OpenRouterClient(config.ai))
        .register(RATE_LIMITER, () => new RateLimiter(config.chat))
        .register(TOKEN_TRACKER, () => new TokenTrackingService(prisma, config.chat))
        .register(PII_DETECTION_REPOSITORY, () => new PiiDetectionRepository(prisma))
        .register(PII_DETECTION_COST_TRACKER, () => new PiiDetectionCostTracker(prisma))
        .register(PII_DETECTION_SERVICE, () => {
            const chatClient = container.resolve<IChatClient>(CHAT_CLIENT);
            return new PiiDetectionService(config.piiDetection, chatClient, {
                masker: new PiiMasker(),
                repository: container.resolve<PiiDetectionRepository>(PII_DETECTION_REPOSITORY),
                costTracker: container.resolve<PiiDetectionCostTracker>(PII_DETECTION_COST_TRACKER),
            });
        })
        .register(MESSAGE_REPOSITORY, () => new MessageRepository(prisma))
        .register(CHAT_STREAM_USE_CASE, () => {
            return new ChatStreamUseCase({
                chatClient: container.resolve(CHAT_CLIENT),
                rateLimiter: container.resolve(RATE_LIMITER),
                tokenTracker: container.resolve(TOKEN_TRACKER),
                piiService: container.resolve(PII_DETECTION_SERVICE),
                messageRepo: container.resolve(MESSAGE_REPOSITORY),
                config,
                prisma,
            });
        })
        .register(SEND_MESSAGE_USE_CASE, () => {
            return new SendMessageUseCase({
                chatClient: container.resolve(CHAT_CLIENT),
                rateLimiter: container.resolve(RATE_LIMITER),
                tokenTracker: container.resolve(TOKEN_TRACKER),
                messageRepo: container.resolve(MESSAGE_REPOSITORY),
                config,
                prisma,
            });
        });

    return container;
}

const containerInstance = createBackendContainer();

export function getBackendContainer(): Container {
    return containerInstance;
}
