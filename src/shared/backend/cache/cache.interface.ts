export interface ICacheService {
    /** Returns undefined on miss, T (including null) on hit. */
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
    del(key: string): Promise<void>;
    /** Glob-style pattern delete using SCAN (non-blocking). */
    delPattern(pattern: string): Promise<void>;
}
