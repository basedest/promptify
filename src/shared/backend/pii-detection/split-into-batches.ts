/**
 * Extracts batches from a streaming buffer for PII detection.
 * - Splits on line-breaks (\n, \r\n); keeps incomplete tail in buffer
 * - If a single line exceeds maxBatchChars, splits it into sub-chunks
 * - If no newlines and buffer exceeds maxBatchChars, emits chunks to avoid unbounded growth
 * - Returns batches to send and the remaining buffer content
 */
export function extractBatchesFromBuffer(
    buffer: string,
    maxBatchChars: number,
): { batches: string[]; remaining: string } {
    const batches: string[] = [];
    if (!buffer || maxBatchChars < 1) {
        return { batches, remaining: buffer };
    }

    const lastNewline = buffer.lastIndexOf('\n');

    if (lastNewline < 0) {
        // No newlines: emit chunks when buffer exceeds maxBatchChars
        if (buffer.length < maxBatchChars) {
            return { batches, remaining: buffer };
        }
        const chunk = buffer.slice(0, maxBatchChars);
        const remaining = buffer.slice(maxBatchChars);
        return { batches: [chunk], remaining };
    }

    const complete = buffer.slice(0, lastNewline + 1);
    const remaining = buffer.slice(lastNewline + 1);

    const lines = complete.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isLastLine = i === lines.length - 1;
        const lineWithNewline = isLastLine ? line : line + '\n';

        if (lineWithNewline.length === 0) continue;

        if (line.length <= maxBatchChars) {
            batches.push(lineWithNewline);
        } else {
            for (let j = 0; j < line.length; j += maxBatchChars) {
                const chunk = line.slice(j, j + maxBatchChars);
                const suffix = !isLastLine && j + maxBatchChars >= line.length ? '\n' : '';
                batches.push(chunk + suffix);
            }
        }
    }

    return { batches, remaining };
}
