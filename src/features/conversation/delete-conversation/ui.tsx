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

type DeleteConversationProps = {
    conversationId: string;
    conversationTitle: string;
    onDelete: (conversationId: string) => void;
    isDeleting?: boolean;
};

export function DeleteConversation({
    conversationId,
    conversationTitle,
    onDelete,
    isDeleting,
}: DeleteConversationProps) {
    const t = useTranslations('chat');
    const [open, setOpen] = useState(false);

    const handleDelete = () => {
        onDelete(conversationId);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{t('deleteConversation')}</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                    <DialogDescription>{t('deleteConfirmDescription', { title: conversationTitle })}</DialogDescription>
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
