'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { trpc } from 'src/shared/api/trpc/client';
import { useModelDisplay } from 'src/entities/model';
import { type PiiMaskRegion } from 'src/shared/ui/pii-mask';
import { cn } from 'src/shared/lib/utils';
import { Markdown } from '~/src/shared/ui/markdown';

export type MessageCardProps = {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    tokenCount?: number;
    model?: string | null; // OpenRouter model ID for assistant messages
    className?: string;
    piiMaskRegions?: PiiMaskRegion[];
    messageId?: string; // For logging unmask actions
};

export function MessageCard({
    role,
    content,
    timestamp,
    tokenCount,
    model,
    className,
    piiMaskRegions = [],
    messageId,
}: MessageCardProps) {
    const t = useTranslations('chat');
    const { getModelName } = useModelDisplay();
    const isUser = role === 'user';
    const [copied, setCopied] = useState(false);
    const { data: modelData } = trpc.models.getById.useQuery({ id: model ?? '' }, { enabled: !!model });

    const handleCopy = () => {
        void navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start', className)}>
            <div className={cn('group flex flex-col gap-1', isUser ? 'max-w-[75%] items-end' : 'w-full items-start')}>
                <div
                    className={cn(
                        'rounded-xl px-4 py-2 text-[15px] leading-7 wrap-break-word',
                        isUser ? 'bg-zinc-100 dark:bg-zinc-800/50' : 'w-full bg-transparent',
                    )}
                >
                    <Markdown
                        piiMaskRegions={piiMaskRegions.length > 0 ? piiMaskRegions : undefined}
                        messageId={messageId}
                    >
                        {content}
                    </Markdown>
                </div>
                <div className="flex h-5 w-max items-center gap-2 px-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-foreground/70 text-xs font-semibold">
                        {isUser ? t('you') : model ? (modelData ? getModelName(modelData) : model) : t('assistant')}
                    </span>
                    <span className="text-muted-foreground text-xs">
                        {timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                    {tokenCount !== undefined && tokenCount > 0 && (
                        <span className="text-muted-foreground text-xs">
                            {tokenCount} {t('tokens')}
                        </span>
                    )}
                    <button
                        onClick={handleCopy}
                        className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        aria-label={t('copyMessage')}
                    >
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
