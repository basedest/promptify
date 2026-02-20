import 'server-only';
import type { PrismaClient } from 'src/generated/prisma/client';
import { logger } from 'src/shared/backend/logger';
import type { PiiDetectionResult } from './types';

export type PiiDetectionQueryFilters = {
    userId?: string;
    conversationId?: string;
    piiType?: string;
    startDate?: Date;
    endDate?: Date;
};

/**
 * Repository for PII detection metadata persistence.
 * Single Responsibility: persist and query PII detection records.
 * Dependency Inversion: depends on Prisma client injected via constructor.
 */
export class PiiDetectionRepository {
    constructor(private readonly prisma: PrismaClient) {}

    /**
     * Persist PII detection metadata. Never stores original PII values, only metadata.
     * Failures are logged but not thrown (must not break stream).
     */
    async persist(messageId: string, detections: PiiDetectionResult[]): Promise<void> {
        if (detections.length === 0) {
            return;
        }

        try {
            await this.prisma.piiDetection.createMany({
                data: detections.map((detection) => ({
                    messageId,
                    piiType: detection.piiType,
                    startOffset: detection.startOffset,
                    endOffset: detection.endOffset,
                    placeholder: detection.placeholder,
                    confidence: detection.confidence ?? null,
                })),
                skipDuplicates: true,
            });

            logger.debug(
                {
                    messageId,
                    detectionCount: detections.length,
                    piiTypes: detections.map((d) => d.piiType),
                },
                'PII detections persisted to database',
            );
        } catch (error) {
            logger.error(
                {
                    error,
                    messageId,
                    detectionCount: detections.length,
                },
                'Failed to persist PII detections to database',
            );
        }
    }

    async findByMessage(messageId: string) {
        return this.prisma.piiDetection.findMany({
            where: { messageId },
            orderBy: { startOffset: 'asc' },
        });
    }

    async findByConversation(conversationId: string) {
        return this.prisma.piiDetection.findMany({
            where: {
                message: {
                    conversationId,
                },
            },
            include: {
                message: {
                    select: {
                        id: true,
                        role: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                detectedAt: 'desc',
            },
        });
    }

    async findByUser(userId: string) {
        return this.prisma.piiDetection.findMany({
            where: {
                message: {
                    conversation: {
                        userId,
                    },
                },
            },
            include: {
                message: {
                    select: {
                        id: true,
                        role: true,
                        conversationId: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                detectedAt: 'desc',
            },
        });
    }

    async query(filters: PiiDetectionQueryFilters) {
        const where: {
            message?: {
                conversation?: { userId: string };
                conversationId?: string;
            };
            piiType?: string;
            detectedAt?: {
                gte?: Date;
                lte?: Date;
            };
        } = {};

        if (filters.userId) {
            where.message = {
                conversation: {
                    userId: filters.userId,
                },
            };
        }

        if (filters.conversationId) {
            where.message = {
                ...where.message,
                conversationId: filters.conversationId,
            };
        }

        if (filters.piiType) {
            where.piiType = filters.piiType;
        }

        if (filters.startDate || filters.endDate) {
            where.detectedAt = {};
            if (filters.startDate) {
                where.detectedAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.detectedAt.lte = filters.endDate;
            }
        }

        return this.prisma.piiDetection.findMany({
            where,
            include: {
                message: {
                    select: {
                        id: true,
                        role: true,
                        conversationId: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                detectedAt: 'desc',
            },
        });
    }
}
