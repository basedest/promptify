import type { PiiType } from 'src/shared/config/env/server';
import { PII_TYPE_TO_PLACEHOLDER } from './prompts';
import type { PiiDetectionResult } from './types';

/** PII types that have strict RegExp patterns (fixed digit length, format validation) */
export const REGEX_PII_TYPES: PiiType[] = ['email', 'phone', 'ssn', 'credit_card', 'ip'];

type RegexPattern = { type: PiiType; regex: RegExp };

/**
 * Strict RegExp patterns for PII detection.
 * - Word boundaries to avoid partial matches
 * - Fixed digit lengths to reduce false positives (e.g., "5" not phone, "1.2.3.4" not IP)
 */
const REGEX_PATTERNS: RegexPattern[] = [
    // email: local@domain.tld, 2+ char TLD
    {
        type: 'email',
        regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    },
    // phone: US 10-digit, area code 2-9, optional +1
    {
        type: 'phone',
        regex: /\b(?:\+1[-.\s]?)?(?:\(?[2-9]\d{2}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
    },
    // SSN: 9 digits, excludes 000/666/9xx area, optional dashes 3-2-4
    {
        type: 'ssn',
        regex: /\b(?!000|666|9\d{2})([0-8]\d{2}|7[0-6]\d|77[0-2])(-?)\d{2}\2\d{4}\b/g,
    },
    // credit_card: Visa 13/16, MC 16, Amex 15, Discover 16
    {
        type: 'credit_card',
        regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    },
    // ip: IPv4, each octet 0-255
    {
        type: 'ip',
        regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    },
];

/**
 * Run RegExp-based PII detection on text.
 * Only detects types that are both in REGEX_PII_TYPES and enabledTypes.
 */
export function detectPiiRegex(text: string, enabledTypes: PiiType[]): PiiDetectionResult[] {
    const regexTypes = new Set(REGEX_PII_TYPES.filter((t) => enabledTypes.includes(t)));
    if (regexTypes.size === 0) return [];

    const results: PiiDetectionResult[] = [];
    const usedRanges: Array<[number, number]> = [];

    for (const { type, regex } of REGEX_PATTERNS) {
        if (!regexTypes.has(type)) continue;

        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;

            const overlaps = usedRanges.some(([s, e]) => start < e && end > s);
            if (overlaps) continue;

            usedRanges.push([start, end]);
            results.push({
                piiType: type,
                startOffset: start,
                endOffset: end,
                placeholder: PII_TYPE_TO_PLACEHOLDER[type],
                confidence: 1,
            });
        }
    }

    results.sort((a, b) => a.startOffset - b.startOffset);
    return results;
}

function overlaps(a: PiiDetectionResult, b: PiiDetectionResult): boolean {
    return a.startOffset < b.endOffset && a.endOffset > b.startOffset;
}

/**
 * Merge RegExp and AI detection results.
 * - RegExp results are kept as-is
 * - AI results that overlap any RegExp span are dropped (RegExp wins)
 * - Non-overlapping AI results are added; overlapping AI-only spans are resolved (first wins)
 */
export function mergeDetections(
    regexResults: PiiDetectionResult[],
    aiResults: PiiDetectionResult[],
): PiiDetectionResult[] {
    const merged: PiiDetectionResult[] = [...regexResults];

    const aiNonOverlapping = aiResults.filter((ai) => !regexResults.some((r) => overlaps(ai, r)));

    const usedRanges: Array<[number, number]> = regexResults.map((r) => [r.startOffset, r.endOffset]);

    for (const ai of aiNonOverlapping.sort((a, b) => a.startOffset - b.startOffset)) {
        const overlapsUsed = usedRanges.some(([s, e]) => ai.startOffset < e && ai.endOffset > s);
        if (overlapsUsed) continue;

        usedRanges.push([ai.startOffset, ai.endOffset]);
        merged.push(ai);
    }

    merged.sort((a, b) => a.startOffset - b.startOffset);
    return merged;
}
