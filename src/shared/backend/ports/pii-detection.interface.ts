import type { PiiDetectionResult, PiiDetectionResponse } from 'src/shared/backend/pii-detection/types';

export interface IPiiDetectionService {
    detectPii(text: string, options?: { userId?: string; conversationId?: string }): Promise<PiiDetectionResponse>;

    maskPiiInText(text: string, detections: PiiDetectionResult[]): string;

    persistDetections(messageId: string, detections: PiiDetectionResult[]): Promise<void>;
}
