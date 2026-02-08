'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from 'src/shared/ui/dropdown-menu';

export function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();
    const t = useTranslations('theme');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    const getThemeIcon = () => {
        switch (theme) {
            case 'light':
                return <Sun className="mr-2 h-4 w-4" />;
            case 'dark':
                return <Moon className="mr-2 h-4 w-4" />;
            default:
                return <Monitor className="mr-2 h-4 w-4" />;
        }
    };

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                {getThemeIcon()}
                <span>{t('title')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                    <DropdownMenuRadioItem value="light">
                        <Sun className="mr-2 h-4 w-4" />
                        <span>{t('light')}</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                        <Moon className="mr-2 h-4 w-4" />
                        <span>{t('dark')}</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                        <Monitor className="mr-2 h-4 w-4" />
                        <span>{t('system')}</span>
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
}
