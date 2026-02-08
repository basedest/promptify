import { PrismaPg } from '@prisma/adapter-pg';
import { withAccelerate } from '@prisma/extension-accelerate';
import { PrismaClient } from 'src/generated/prisma/client';
import { getServerConfig } from 'src/shared/config/env';

const config = getServerConfig();
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const isAccelerate = config.database.url.startsWith('prisma');

const prismaClient =
    globalForPrisma.prisma ??
    (isAccelerate
        ? new PrismaClient({
              accelerateUrl: config.database.url,
          }).$extends(withAccelerate())
        : new PrismaClient({
              adapter: new PrismaPg({
                  connectionString: config.database.url,
              }),
          }));

export const prisma = prismaClient;

if (config.nodeEnv !== 'production') {
    globalForPrisma.prisma = prisma;
}
