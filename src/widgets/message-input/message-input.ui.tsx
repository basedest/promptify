'use client';

import { ArrowUp, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'src/shared/ui/button';
import { Textarea } from 'src/shared/ui/textarea';
import { cn } from '~/src/shared/lib/utils';

const MAX_MESSAGE_LENGTH = 4000;

type MessageInputProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
    isSubmitting?: boolean;
    isAtBottom?: boolean;
};

export function MessageInput({ value, onChange, onSubmit, disabled, isSubmitting, isAtBottom }: MessageInputProps) {
    const t = useTranslations('chat');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && !isSubmitting && value.trim() && value.length <= MAX_MESSAGE_LENGTH) {
                onSubmit();
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        if (newValue.length <= MAX_MESSAGE_LENGTH) {
            onChange(newValue);
        }
    };

    const charCount = value.length;
    const isNearLimit = charCount > MAX_MESSAGE_LENGTH * 0.9;
    const isOverLimit = charCount > MAX_MESSAGE_LENGTH;
    const showCharCounter = isNearLimit || isOverLimit;
    const canSubmit = !disabled && !isSubmitting && value.trim() && !isOverLimit;
    const isMultiline = value.includes('\n') || value.length > 128;
    const textareaClassName =
        'max-h-[200px] min-h-10 flex-1 resize-none border-none [scrollbar-color:var(--color-border)_transparent] focus-visible:border-none focus-visible:shadow-none focus-visible:ring-0 dark:bg-transparent [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent';
    const submitLabel = isSubmitting ? t('sending') : t('send');

    const messageTextarea = (
        <Textarea
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t('messageInputPlaceholder')}
            disabled={disabled || isSubmitting}
            className={textareaClassName}
            rows={1}
        />
    );

    const submitButton = (
        <Button onClick={onSubmit} disabled={!canSubmit} className="h-10 rounded-full" aria-label={submitLabel}>
            {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
                <ArrowUp className="size-4" aria-hidden="true" />
            )}
            <span className="sr-only">{submitLabel}</span>
        </Button>
    );

    return (
        <div className={cn('bg-background p-4', isAtBottom && 'sticky bottom-0')}>
            <div className="mx-auto max-w-3xl">
                <div className="bg-accent flex flex-col gap-2 rounded-4xl p-2">
                    {isMultiline ? (
                        <div className="flex flex-col">
                            {messageTextarea}
                            <div
                                className={`relative mt-1 flex items-center pt-2 ${
                                    showCharCounter ? 'justify-between' : 'justify-end'
                                }`}
                            >
                                <div
                                    aria-hidden="true"
                                    className="to-accent pointer-events-none absolute inset-x-0 -top-3 h-3 bg-linear-to-b from-transparent"
                                />
                                {showCharCounter && (
                                    <p
                                        className={`ml-3 text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}
                                    >
                                        {charCount} / {MAX_MESSAGE_LENGTH}
                                    </p>
                                )}
                                {submitButton}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-end gap-2">
                            {messageTextarea}
                            {submitButton}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
