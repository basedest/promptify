import type { ICacheService } from './cache.interface';

export class NoopCacheService implements ICacheService {
    async get<T>(_key: string): Promise<T | undefined> {
        return undefined;
    }

    async set<T>(_key: string, _value: T, _ttlSeconds: number): Promise<void> {}

    async del(_key: string): Promise<void> {}

    async delPattern(_pattern: string): Promise<void> {}
}
