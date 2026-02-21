import { useTranslations } from 'next-intl';
import { cn } from '~/src/shared/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const appTitleVariants = cva('truncate text-lg font-extrabold tracking-wider drop-shadow-[0_0_6px_currentColor]', {
    variants: {
        size: {
            default: 'text-lg',
        },
    },
    defaultVariants: {
        size: 'default',
    },
});
export function AppTitle({
    className,
    size = 'default',
    ...props
}: React.ComponentProps<'span'> & VariantProps<typeof appTitleVariants>) {
    const t = useTranslations('metadata');

    return (
        <span className={cn(appTitleVariants({ size }), className)} {...props}>
            {t('title')}
        </span>
    );
}
