'use client';

import { useRouter } from 'next/navigation';

type BackButtonProps = {
    label: string;
    fallback?: string;
};

export function BackButton({ label, fallback = '/' }: BackButtonProps) {
    const router = useRouter();

    const handleClick = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push(fallback);
        }
    };

    return (
        <button onClick={handleClick} className="text-muted-foreground hover:text-primary cursor-pointer text-sm">
            {label}
        </button>
    );
}
