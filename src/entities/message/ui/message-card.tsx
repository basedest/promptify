'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from 'src/shared/ui/card';
import { PiiMask, type PiiMaskRegion } from 'src/shared/ui/pii-mask';
import { cn } from 'src/shared/lib/utils';

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

    return (
        <div className={cn('flex w-full py-3', isUser ? 'justify-end' : 'justify-start', className)}>
            <Card
                className={cn(
                    'max-w-[75%] border-none shadow-none',
                    isUser && 'bg-slate-100 dark:bg-slate-800/50',
                    isAssistant && 'bg-transparent',
                )}
            >
                <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground/70">
                                {isUser ? 'You' : 'Assistant'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {timestamp.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                            {tokenCount !== undefined && tokenCount > 0 && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                    {tokenCount} {t('tokens')}
                                </span>
                            )}
                        </div>
                        <div className="text-[15px] leading-7 break-words whitespace-pre-wrap">
                            {piiMaskRegions.length > 0 ? (
                                <PiiMask text={content} maskRegions={piiMaskRegions} messageId={messageId} />
                            ) : (
                                <p>{content}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
