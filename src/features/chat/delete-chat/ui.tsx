'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'src/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from 'src/shared/ui/dialog';

type DeleteChatProps = {
    chatId: string;
    chatTitle: string;
    onDelete: (conversationId: string) => void;
    isDeleting?: boolean;
    /** When set, dialog is controlled and no trigger is rendered (e.g. opened from a dropdown). */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

export function DeleteChat({
    chatId,
    chatTitle,
    onDelete,
    isDeleting,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: DeleteChatProps) {
    const t = useTranslations('chat');
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

    const handleDelete = () => {
        onDelete(chatId);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t('deleteConversation')}</span>
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                    <DialogDescription>{t('deleteConfirmDescription', { title: chatTitle })}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
                        {t('cancel')}
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? t('deleting') : t('delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
