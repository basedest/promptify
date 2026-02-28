'use client';

import { useMemo } from 'react';
import { trpc } from 'src/shared/api/trpc/client';

/** Returns Map<modelId, Map<groupName, bestScore>> */
export function useBenchmarks(): Map<string, Map<string, number>> {
    const { data: groups } = trpc.models.listBenchmarks.useQuery(undefined, {
        staleTime: 10 * 60 * 1000,
    });

    return useMemo(() => {
        const map = new Map<string, Map<string, number>>();
        if (!groups) return map;
        for (const group of groups) {
            for (const bench of group.benchmarks) {
                for (const r of bench.results) {
                    if (!map.has(r.modelId)) map.set(r.modelId, new Map());
                    const existing = map.get(r.modelId)!.get(group.name);
                    if (existing === undefined || r.score > existing) {
                        map.get(r.modelId)!.set(group.name, r.score);
                    }
                }
            }
        }
        return map;
    }, [groups]);
}
