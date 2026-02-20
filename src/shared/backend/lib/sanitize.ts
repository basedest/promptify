/**
 * Sanitize user input: strip HTML tags and trim whitespace
 */
export function sanitizeInput(input: string): string {
    return input.replace(/<[^>]*>/g, '').trim();
}
