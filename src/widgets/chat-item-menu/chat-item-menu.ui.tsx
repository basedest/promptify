'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DeleteChat } from 'src/features/chat/delete-chat';
import { RenameChat } from 'src/features/chat/rename-chat';
import { Button } from 'src/shared/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from 'src/shared/ui/dropdown-menu';

type ChatItemMenuProps = {
    chatId: string;
    chatTitle: string;
    onDelete?: (chatId: string) => void;
    isDeleting?: boolean;
};

export function ChatItemMenu({ chatId, chatTitle, onDelete, isDeleting }: ChatItemMenuProps) {
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
                        className="hover:bg-accent h-8 w-8 shrink-0 cursor-pointer opacity-0 group-hover/conversation:opacity-100 group-data-[active=true]/conversation:opacity-100"
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
            <RenameChat chatId={chatId} currentTitle={chatTitle} open={renameOpen} onOpenChange={setRenameOpen} />
            {onDelete && (
                <DeleteChat
                    chatId={chatId}
                    chatTitle={chatTitle}
                    onDelete={onDelete}
                    isDeleting={isDeleting}
                    open={deleteOpen}
                    onOpenChange={setDeleteOpen}
                />
            )}
        </>
    );
}
