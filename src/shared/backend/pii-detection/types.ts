import type { PiiType } from 'src/shared/config/env/server';

/**
 * PII detection result for a single detected instance
 */
export type PiiDetectionResult = {
    /** PII type (email, phone, ssn, etc.) */
    piiType: PiiType;
    /** Character offset where PII starts (inclusive) */
    startOffset: number;
    /** Character offset where PII ends (exclusive) */
    endOffset: number;
    /** Placeholder text (e.g., "[EMAIL]", "[PHONE]") */
    placeholder: string;
    /** Detection confidence score 0-1, if available */
    confidence?: number;
};

/**
 * Response from PII detection service
 */
export type PiiDetectionResponse = {
    /** Array of detected PII instances */
    detections: PiiDetectionResult[];
    /** Whether detection completed successfully */
    success: boolean;
    /** Error message if detection failed */
    error?: string;
};
