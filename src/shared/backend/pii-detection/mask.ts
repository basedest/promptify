import type { PiiDetectionResult } from './types';

export type PiiMaskerConfig = {
    /** Character used to replace PII (default: bullet •) */
    maskChar?: string;
};

/**
 * Masks PII in text with length-preserving obfuscation.
 * Single Responsibility: apply masking strategy to text given detection results.
 */
export class PiiMasker {
    private readonly maskChar: string;

    constructor(config: PiiMaskerConfig = {}) {
        this.maskChar = config.maskChar ?? '•';
    }

    /**
     * Mask PII in text. Sorts detections by startOffset descending to avoid offset shifts when replacing.
     */
    mask(text: string, detections: PiiDetectionResult[]): string {
        if (detections.length === 0) {
            return text;
        }

        const sortedDetections = [...detections].sort((a, b) => b.startOffset - a.startOffset);
        let maskedText = text;

        for (const detection of sortedDetections) {
            const { startOffset, endOffset } = detection;
            const originalLength = endOffset - startOffset;
            const mask = this.maskChar.repeat(originalLength);
            maskedText = maskedText.slice(0, startOffset) + mask + maskedText.slice(endOffset);
        }

        return maskedText;
    }
}
