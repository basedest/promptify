'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from 'src/shared/api/trpc/client';
import { Button } from 'src/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from 'src/shared/ui/dialog';
import { Input } from 'src/shared/ui/input';
import { getClientConfig } from 'src/shared/config/env/client';

type RenameChatProps = {
    chatId: string;
    currentTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function RenameChat({ chatId, currentTitle, open, onOpenChange }: RenameChatProps) {
    const t = useTranslations('chat');
    const utils = trpc.useUtils();
    const { chat } = getClientConfig();
    const [title, setTitle] = useState(currentTitle);

    const updateMutation = trpc.chat.update.useMutation({
        onSuccess: () => {
            utils.chat.list.invalidate();
            onOpenChange(false);
        },
    });

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTitle(currentTitle);
            updateMutation.reset();
        }
    }, [open, currentTitle, updateMutation]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) return;
        updateMutation.mutate({ id: chatId, title: trimmed });
    };

    const isPending = updateMutation.isPending;
    const maxLength = chat.maxConversationTitleLength;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('renameDialogTitle')}</DialogTitle>
                        <DialogDescription>{t('renameDialogDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('renamePlaceholder')}
                            maxLength={maxLength}
                            autoFocus
                            disabled={isPending}
                            aria-invalid={updateMutation.isError}
                        />
                        <p className="text-muted-foreground mt-1 text-xs">
                            {title.length} / {maxLength}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={!title.trim() || isPending}>
                            {isPending ? t('renaming') : t('save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
