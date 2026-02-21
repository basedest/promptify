'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type PiiMaskRegion } from 'src/shared/ui/pii-mask';
import { cn } from 'src/shared/lib/utils';
import { Markdown } from '~/src/shared/ui/markdown';

export type MessageCardProps = {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    tokenCount?: number;
    className?: string;
    piiMaskRegions?: PiiMaskRegion[];
    messageId?: string; // For logging unmask actions
};

export function MessageCard({
    role,
    content,
    timestamp,
    tokenCount,
    className,
    piiMaskRegions = [],
    messageId,
}: MessageCardProps) {
    const t = useTranslations('chat');
    const isUser = role === 'user';
    const isAssistant = role === 'assistant';
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        void navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start', className)}>
            <div className={cn('group flex max-w-[75%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
                <div
                    className={cn(
                        'rounded-xl px-4 py-2 text-[15px] leading-7 wrap-break-word',
                        isUser ? 'bg-zinc-100 dark:bg-zinc-800/50' : 'bg-transparent',
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
                        {isUser ? t('you') : t('assistant')}
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
