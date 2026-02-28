'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { trpc } from 'src/shared/api/trpc/client';
import type { ModelDefinition } from 'src/shared/config/models';

const STORAGE_KEY = 'yapp:favorite-models';

let listeners: Array<() => void> = [];

function emitChange() {
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void) {
    listeners = [...listeners, listener];
    return () => {
        listeners = listeners.filter((l) => l !== listener);
    };
}

const EMPTY_FAVORITES: string[] = [];
let cachedSnapshot: string[] = EMPTY_FAVORITES;
let cachedSerialized: string = '[]';

function getSnapshot(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const serialized = raw ?? '[]';
        if (serialized === cachedSerialized) {
            return cachedSnapshot;
        }
        cachedSerialized = serialized;
        cachedSnapshot = serialized === '[]' ? EMPTY_FAVORITES : (JSON.parse(serialized) as string[]);
        return cachedSnapshot;
    } catch {
        if (cachedSerialized === '[]') {
            return cachedSnapshot;
        }
        cachedSerialized = '[]';
        cachedSnapshot = EMPTY_FAVORITES;
        return cachedSnapshot;
    }
}

function getServerSnapshot(): string[] {
    return EMPTY_FAVORITES;
}

function setFavorites(ids: string[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    emitChange();
}

export function useFavoriteModels() {
    const favoriteIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const { data: enabledModels = [] } = trpc.models.list.useQuery(undefined, {
        staleTime: 5 * 60 * 1000,
    });

    const favorites: ModelDefinition[] = useMemo(
        () => favoriteIds.map((id) => enabledModels.find((m) => m.id === id)).filter((m): m is ModelDefinition => !!m),
        [favoriteIds, enabledModels],
    );

    const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds]);

    const toggleFavorite = useCallback((id: string) => {
        const current = getSnapshot();
        if (current.includes(id)) {
            setFavorites(current.filter((fid) => fid !== id));
        } else {
            setFavorites([...current, id]);
        }
    }, []);

    return { favorites, isFavorite, toggleFavorite };
}
