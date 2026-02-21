'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from 'src/shared/ui/card';
import { Markdown } from 'src/shared/ui/markdown';
import type { PiiMaskRegion } from 'src/shared/ui/pii-mask';

type TypingIndicatorProps = {
    content?: string;
    piiMaskRegions?: PiiMaskRegion[];
};

export function TypingIndicator({ content, piiMaskRegions = [] }: TypingIndicatorProps) {
    const t = useTranslations('chat');

    return (
        <div className="flex w-full justify-start py-3">
            <Card className="max-w-[75%] border-none bg-transparent shadow-none">
                <CardContent className="p-4">
                    {content ? (
                        <>
                            <div className="text-[15px] leading-7 wrap-break-word">
                                <Markdown piiMaskRegions={piiMaskRegions.length > 0 ? piiMaskRegions : undefined}>
                                    {content}
                                </Markdown>
                            </div>
                            <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
                        </>
                    ) : (
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <span>{t('typing')}</span>
                            <div className="flex gap-1">
                                <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
