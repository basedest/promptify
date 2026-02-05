import 'server-only';
import { randomUUID } from 'crypto';
import type { PiiDetectionResult } from './types';
import { logger } from 'src/shared/lib/logger';

/**
 * Escape text content for safe embedding inside PII tags
 */
function escapeTagContent(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Unescape text content from PII tags
 */
function unescapeTagContent(text: string): string {
    return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/**
 * Insert PII tags into content based on detection results
 * Tags are inserted in reverse order to maintain offset accuracy
 *
 * @param content - Original untagged content
 * @param detections - PII detection results with offsets
 * @returns Content with PII wrapped in tags
 */
export function insertPiiTags(content: string, detections: PiiDetectionResult[]): string {
    logger.info(
        {
            contentLength: content.length,
            detectionCount: detections.length,
            detections: detections.map((d) => ({
                piiType: d.piiType,
                startOffset: d.startOffset,
                endOffset: d.endOffset,
                length: d.endOffset - d.startOffset,
            })),
        },
        'insertPiiTags called',
    );

    if (detections.length === 0) {
        logger.debug('No detections provided, returning original content');
        return content;
    }

    // Sort detections by startOffset (descending) to insert from end to start
    // This prevents offset shifts from affecting subsequent insertions
    const sortedDetections = [...detections].sort((a, b) => b.startOffset - a.startOffset);

    let taggedContent = content;
    let tagsInserted = 0;

    for (const detection of sortedDetections) {
        const { startOffset, endOffset, piiType, confidence } = detection;

        // Validate offsets
        if (startOffset < 0 || endOffset > taggedContent.length || startOffset >= endOffset) {
            logger.warn(
                {
                    startOffset,
                    endOffset,
                    contentLength: taggedContent.length,
                    piiType,
                },
                'Invalid PII detection offset, skipping tag insertion',
            );
            continue;
        }

        // Extract original PII text
        const piiText = taggedContent.slice(startOffset, endOffset);
        const escapedText = escapeTagContent(piiText);

        // Generate unique ID for this detection
        const piiId = randomUUID();

        // Build tag with optional confidence
        const openTag =
            confidence !== undefined
                ? `<pii type="${piiType}" id="${piiId}" confidence="${confidence.toFixed(2)}">`
                : `<pii type="${piiType}" id="${piiId}">`;
        const closeTag = '</pii>';

        logger.debug(
            {
                piiType,
                piiId,
                startOffset,
                endOffset,
                piiText: piiText.slice(0, 50),
                tagLength: openTag.length + escapedText.length + closeTag.length,
            },
            'Inserting PII tag',
        );

        // Insert tags around PII
        taggedContent =
            taggedContent.slice(0, startOffset) + openTag + escapedText + closeTag + taggedContent.slice(endOffset);

        tagsInserted++;
    }

    logger.info(
        {
            originalLength: content.length,
            taggedLength: taggedContent.length,
            tagsInserted,
            hasPiiTags: taggedContent.includes('<pii '),
        },
        'insertPiiTags completed',
    );

    return taggedContent;
}

/**
 * Parse PII tags from content and extract mask regions
 * Used when reading messages from DB to apply UI masking
 *
 * @param taggedContent - Content with PII tags
 * @returns Object with untagged text and mask regions
 */
export function parsePiiTags(taggedContent: string): {
    text: string;
    maskRegions: Array<{
        startOffset: number;
        endOffset: number;
        piiType: string;
        piiId: string;
        originalLength: number;
    }>;
} {
    const maskRegions: Array<{
        startOffset: number;
        endOffset: number;
        piiType: string;
        piiId: string;
        originalLength: number;
    }> = [];

    // Regex to match PII tags: <pii type="email" id="abc" confidence="0.95">content</pii>
    const tagRegex = /<pii\s+type="([^"]+)"\s+id="([^"]+)"(?:\s+confidence="[^"]+")?>([^<]*)<\/pii>/g;

    let match;
    let currentOffset = 0;
    let untaggedText = '';

    while ((match = tagRegex.exec(taggedContent)) !== null) {
        const [fullMatch, piiType, piiId, escapedContent] = match;
        const matchStart = match.index;

        // Add text before this tag
        untaggedText += taggedContent.slice(currentOffset, matchStart);

        // Unescape content
        const piiContent = unescapeTagContent(escapedContent);

        // Record mask region (offset in UNTAGGED text)
        const startOffset = untaggedText.length;
        const endOffset = startOffset + piiContent.length;

        maskRegions.push({
            startOffset,
            endOffset,
            piiType,
            piiId,
            originalLength: piiContent.length,
        });

        // Add unescaped PII content to output
        untaggedText += piiContent;

        currentOffset = matchStart + fullMatch.length;
    }

    // Add remaining text after last tag
    untaggedText += taggedContent.slice(currentOffset);

    return {
        text: untaggedText,
        maskRegions,
    };
}

/**
 * Validate that content has well-formed PII tags
 * Returns true if valid, false if malformed
 */
export function validatePiiTags(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unclosed tags
    const openTags = (content.match(/<pii\s+/g) || []).length;
    const closeTags = (content.match(/<\/pii>/g) || []).length;

    if (openTags !== closeTags) {
        errors.push(`Mismatched PII tags: ${openTags} open, ${closeTags} close`);
    }

    // Check for nested tags (not allowed)
    const tagRegex = /<pii\s+type="([^"]+)"\s+id="([^"]+)"(?:\s+confidence="[^"]+")?>([^<]*)<\/pii>/g;
    const matches = Array.from(content.matchAll(tagRegex));

    for (let i = 0; i < matches.length - 1; i++) {
        const current = matches[i];
        const next = matches[i + 1];

        if (next.index !== undefined && current.index !== undefined) {
            if (next.index < current.index + current[0].length) {
                errors.push(`Nested PII tags detected at position ${next.index}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
