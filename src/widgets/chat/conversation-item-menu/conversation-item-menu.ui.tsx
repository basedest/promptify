'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DeleteConversation } from 'src/features/conversation/delete-conversation';
import { RenameConversation } from 'src/features/conversation/rename-conversation';
import { Button } from 'src/shared/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from 'src/shared/ui/dropdown-menu';

type ConversationItemMenuProps = {
    conversationId: string;
    conversationTitle: string;
    onDelete?: (conversationId: string) => void;
    isDeleting?: boolean;
};

export function ConversationItemMenu({
    conversationId,
    conversationTitle,
    onDelete,
    isDeleting,
}: ConversationItemMenuProps) {
    const t = useTranslations('chat');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
                        aria-label={t('conversationActions')}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                        <Pencil className="size-4" />
                        {t('rename')}
                    </DropdownMenuItem>
                    {onDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDeleteOpen(true)}
                                disabled={isDeleting}
                            >
                                <Trash2 className="size-4" />
                                {t('delete')}
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <RenameConversation
                conversationId={conversationId}
                currentTitle={conversationTitle}
                open={renameOpen}
                onOpenChange={setRenameOpen}
            />
            {onDelete && (
                <DeleteConversation
                    conversationId={conversationId}
                    conversationTitle={conversationTitle}
                    onDelete={onDelete}
                    isDeleting={isDeleting}
                    open={deleteOpen}
                    onOpenChange={setDeleteOpen}
                />
            )}
        </>
    );
}
