import 'server-only';
import { prisma } from 'src/shared/backend/prisma';
import { logger } from 'src/shared/backend/logger';
import type { PiiDetectionResult } from './types';

/**
 * Persist PII detection metadata to database
 * Never stores original PII values, only metadata (offsets, types, placeholders)
 * @param messageId - ID of the message where PII was detected
 * @param detections - Array of PII detection results
 * @returns Promise that resolves when persistence completes (or fails silently)
 */
export async function persistPiiDetections(messageId: string, detections: PiiDetectionResult[]): Promise<void> {
    if (detections.length === 0) {
        return;
    }

    try {
        await prisma.piiDetection.createMany({
            data: detections.map((detection) => ({
                messageId,
                piiType: detection.piiType,
                startOffset: detection.startOffset,
                endOffset: detection.endOffset,
                placeholder: detection.placeholder,
                confidence: detection.confidence ?? null,
            })),
            skipDuplicates: true, // Skip if somehow duplicate detections exist
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
        // Never throw - DB write failures must not break the stream
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

/**
 * Query PII detections by message ID
 */
export async function getPiiDetectionsByMessage(messageId: string) {
    return prisma.piiDetection.findMany({
        where: { messageId },
        orderBy: { startOffset: 'asc' },
    });
}

/**
 * Query PII detections by conversation ID
 */
export async function getPiiDetectionsByConversation(conversationId: string) {
    return prisma.piiDetection.findMany({
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

/**
 * Query PII detections by user ID
 */
export async function getPiiDetectionsByUser(userId: string) {
    return prisma.piiDetection.findMany({
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

/**
 * Query PII detections with filters
 */
export async function queryPiiDetections(filters: {
    userId?: string;
    conversationId?: string;
    piiType?: string;
    startDate?: Date;
    endDate?: Date;
}) {
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

    return prisma.piiDetection.findMany({
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
