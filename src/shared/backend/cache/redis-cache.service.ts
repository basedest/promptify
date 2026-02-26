import 'server-only';
import type Redis from 'ioredis';
import superjson from 'superjson';
import { logger } from 'src/shared/backend/logger';
import type { ICacheService } from './cache.interface';

export class RedisCacheService implements ICacheService {
    constructor(private readonly redis: Redis) {}

    async get<T>(key: string): Promise<T | undefined> {
        try {
            const raw = await this.redis.get(key);
            if (raw === null) return undefined;
            const { v } = superjson.parse<{ v: T }>(raw);
            return v;
        } catch (err) {
            logger.error({ err, key }, 'Redis get failed');
            return undefined;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        try {
            await this.redis.set(key, superjson.stringify({ v: value }), 'EX', ttlSeconds);
        } catch (err) {
            logger.error({ err, key }, 'Redis set failed');
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.redis.del(key);
        } catch (err) {
            logger.error({ err, key }, 'Redis del failed');
        }
    }

    async delPattern(pattern: string): Promise<void> {
        try {
            let cursor = '0';
            do {
                const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = next;
                if (keys.length > 0) await this.redis.del(...keys);
            } while (cursor !== '0');
        } catch (err) {
            logger.error({ err, pattern }, 'Redis delPattern failed');
        }
    }
}
