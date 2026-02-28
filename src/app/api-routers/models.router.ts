import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from './init';
import { prisma } from 'src/shared/backend/prisma';
import { getEnabledModels, getModelById } from 'src/shared/backend/model-service';

export const modelsRouter = createTRPCRouter({
    list: publicProcedure.query(async () => {
        return getEnabledModels(prisma);
    }),

    getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
        return getModelById(prisma, input.id);
    }),

    listBenchmarks: protectedProcedure.query(async () => {
        return prisma.benchmarkGroup.findMany({
            orderBy: { sortOrder: 'asc' },
            include: {
                benchmarks: {
                    select: {
                        id: true,
                        name: true,
                        results: {
                            select: { modelId: true, score: true, version: true },
                        },
                    },
                },
            },
        });
    }),
});
