import type { PiiDetectionResult } from './types';

/**
 * Mask PII in text with length-preserving obfuscation
 * Uses bullet character (•) to replace PII while preserving length
 */
export function maskPiiInText(text: string, detections: PiiDetectionResult[]): string {
    if (detections.length === 0) {
        return text;
    }

    // Sort detections by startOffset (descending) to avoid offset shifts when replacing
    const sortedDetections = [...detections].sort((a, b) => b.startOffset - a.startOffset);

    let maskedText = text;

    for (const detection of sortedDetections) {
        const { startOffset, endOffset } = detection;
        const originalLength = endOffset - startOffset;
        const mask = '•'.repeat(originalLength);
        maskedText = maskedText.slice(0, startOffset) + mask + maskedText.slice(endOffset);
    }

    return maskedText;
}

/**
 * Apply retroactive masking to already-sent content
 * Returns the masked version and a list of mask regions
 */
export function applyRetroactiveMasking(
    text: string,
    detections: PiiDetectionResult[],
): { maskedText: string; maskRegions: Array<{ start: number; end: number; type: string; originalLength: number }> } {
    const maskedText = maskPiiInText(text, detections);
    const maskRegions = detections.map((d) => ({
        start: d.startOffset,
        end: d.endOffset,
        type: d.piiType,
        originalLength: d.endOffset - d.startOffset,
    }));

    return { maskedText, maskRegions };
}
