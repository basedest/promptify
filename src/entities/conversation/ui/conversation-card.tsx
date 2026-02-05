'use client';

import { useTranslations } from 'next-intl';
import { cn } from 'src/shared/lib/utils';

export type ConversationCardProps = {
    id: string;
    title: string;
    messageCount?: number;
    totalTokens?: number;
    updatedAt: Date;
    isActive?: boolean;
    onClick?: () => void;
    className?: string;
};

export function ConversationCard({
    title,
    messageCount,
    totalTokens,
    updatedAt,
    isActive,
    onClick,
    className,
}: ConversationCardProps) {
    const t = useTranslations('chat');
    const formattedDate = updatedAt.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: updatedAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });

    const meta: string[] = [formattedDate];
    if (messageCount !== undefined) {
        meta.push(messageCount === 1 ? `1 ${t('message')}` : `${messageCount} ${t('messages')}`);
    }
    if (totalTokens !== undefined && totalTokens > 0) {
        meta.push(`${totalTokens.toLocaleString()} ${t('tokens')}`);
    }
    const metaLine = meta.join(' · ');

    return (
        <button
            type="button"
            className={cn(
                'flex w-full flex-col gap-0.5 rounded-sm px-2 py-1.5 text-left transition-colors',
                'hover:bg-accent/80',
                isActive && 'bg-accent',
                className,
            )}
            onClick={onClick}
        >
            <span className="min-w-0 truncate text-sm font-medium" title={title}>
                {title}
            </span>
            {(messageCount !== undefined || totalTokens !== undefined) && (
                <span className="text-muted-foreground truncate text-xs">{metaLine}</span>
            )}
        </button>
    );
}
