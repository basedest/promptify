import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from 'src/app/api-routers/init';
import { prisma } from 'src/shared/backend/prisma';
import { routing } from '~/i18n/routing';
import { CACHE_SERVICE } from 'src/shared/backend/container';
import { CacheKeys, type ICacheService } from 'src/shared/backend/cache';

export const userRouter = createTRPCRouter({
    getLocale: protectedProcedure.query(async ({ ctx }) => {
        const cache = ctx.container.resolve<ICacheService>(CACHE_SERVICE);
        const key = CacheKeys.userLocale(ctx.userId);
        const cached = await cache.get<string | null>(key);
        if (cached !== undefined) return cached;

        const user = await prisma.user.findUnique({
            where: { id: ctx.userId },
            select: { locale: true },
        });
        const locale = user?.locale ?? null;
        await cache.set(key, locale, 3600);
        return locale;
    }),

    setLocale: protectedProcedure
        .input(z.object({ locale: z.enum(routing.locales) }))
        .mutation(async ({ ctx, input }) => {
            await prisma.user.update({
                where: { id: ctx.userId },
                data: { locale: input.locale },
            });
            await ctx.container.resolve<ICacheService>(CACHE_SERVICE).del(CacheKeys.userLocale(ctx.userId));
        }),
});
