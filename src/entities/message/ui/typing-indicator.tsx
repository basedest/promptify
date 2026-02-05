'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from 'src/shared/ui/card';

type TypingIndicatorProps = {
    content?: string;
};

export function TypingIndicator({ content }: TypingIndicatorProps) {
    const t = useTranslations('chat');

    return (
        <Card className="max-w-[80%] self-start">
            <CardContent className="p-4">
                {content ? (
                    <div className="break-words whitespace-pre-wrap">
                        {content}
                        <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
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
    );
}
