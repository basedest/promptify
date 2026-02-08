'use client';

import { Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'src/shared/ui/button';
import { Textarea } from 'src/shared/ui/textarea';

const MAX_MESSAGE_LENGTH = 4000;

type MessageInputProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
    isSubmitting?: boolean;
};

export function MessageInput({ value, onChange, onSubmit, disabled, isSubmitting }: MessageInputProps) {
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
    const canSubmit = !disabled && !isSubmitting && value.trim() && !isOverLimit;

    return (
        <div className="bg-background border-t p-4">
            <div className="mx-auto max-w-3xl">
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Textarea
                            value={value}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            placeholder={t('messageInputPlaceholder')}
                            disabled={disabled || isSubmitting}
                            className="max-h-[200px] min-h-10 flex-1 resize-none"
                            rows={1}
                        />
                        <Button
                            onClick={onSubmit}
                            disabled={!canSubmit}
                            className="h-10 self-end"
                            aria-label={isSubmitting ? t('sending') : t('send')}
                        >
                            {isSubmitting ? (
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <Send className="size-4" aria-hidden="true" />
                            )}
                            <span className="sr-only">{isSubmitting ? t('sending') : t('send')}</span>
                        </Button>
                    </div>
                    {(isNearLimit || isOverLimit) && (
                        <p
                            className={`text-right text-xs ${
                                isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                            }`}
                        >
                            {charCount} / {MAX_MESSAGE_LENGTH}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
