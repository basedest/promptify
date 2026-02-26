import 'server-only';
import Redis from 'ioredis';
import { getServerConfig } from 'src/shared/config/env';
import { logger } from 'src/shared/backend/logger';

const globalForRedis = globalThis as unknown as { redis: Redis | null | undefined };

function createRedisClient(): Redis | null {
    const {
        redis: { url },
    } = getServerConfig();
    if (!url) {
        logger.info('REDIS_URL not set — server-side caching disabled');
        return null;
    }
    const client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        connectTimeout: 5_000,
    });
    client.on('error', (err) => logger.error({ err }, 'Redis error'));
    return client;
}

export const redisClient: Redis | null =
    globalForRedis.redis !== undefined ? globalForRedis.redis : createRedisClient();

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redisClient;
}
