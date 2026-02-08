import type { PiiType } from 'src/shared/config/env/server';

/**
 * PII type descriptions for prompts (semantic only; no offsets)
 */
const PII_TYPE_DESCRIPTIONS: Record<PiiType, string> = {
    email: 'Email addresses (e.g., user@example.com)',
    phone: 'Phone numbers (e.g., 555-1234, (555) 123-4567, +1-555-123-4567)',
    ssn: 'Social Security Numbers (e.g., 123-45-6789)',
    credit_card: 'Credit card numbers (e.g., 4532-1234-5678-9010)',
    address: 'Physical addresses (street, city, state, zip)',
    full_name: 'Full names of people (first and last name together)',
    gov_id: 'Government ID numbers (passport, driver license, etc.)',
    ip: 'IP addresses (IPv4 or IPv6)',
    dob: 'Date of birth (e.g., 01/15/1990, January 15, 1990)',
};

/**
 * Canonical placeholder per PII type. System-owned; do not ask the model for placeholders.
 */
export const PII_TYPE_TO_PLACEHOLDER: Record<PiiType, string> = {
    email: '[EMAIL]',
    phone: '[PHONE]',
    ssn: '[SSN]',
    credit_card: '[CREDIT_CARD]',
    address: '[ADDRESS]',
    full_name: '[NAME]',
    gov_id: '[GOV_ID]',
    ip: '[IP]',
    dob: '[DOB]',
};

/**
 * Build system prompt for PII detection.
 * Model's job is semantic only: identify what text is PII. No offsets, no placeholders.
 */
export function buildSystemPrompt(enabledPiiTypes: PiiType[]): string {
    const enabledTypes = enabledPiiTypes.map((type) => `- ${type}: ${PII_TYPE_DESCRIPTIONS[type]}`).join('\n');

    return `You are a PII detection system. Your task is to identify Personally Identifiable Information (PII) in text.

PII types to detect:
${enabledTypes}

Rules:
1. Only detect PII that is clearly identifiable (high confidence).
2. Avoid false positives (e.g., "Call me at 5PM" is not a phone number).
3. Detect PII only if it is fully present in the provided text. Do not guess at partial or truncated PII.

Return results as a JSON array only. Each item: piiType, value (exact substring), and confidence (required, 0–1). No markdown or explanation.`;
}

/**
 * Build user prompt for PII detection.
 * Asks only for piiType, value, and confidence. Offsets and placeholders are derived by the system.
 */
export function buildDetectionPrompt(text: string, enabledPiiTypes: PiiType[]): string {
    const typesList = enabledPiiTypes.join(', ');
    return `Analyze the following text and detect all instances of Personally Identifiable Information (PII).

PII types to detect: ${typesList}

Text to analyze:
"""
${text}
"""

Return a JSON array of detected PII instances. Each instance must have:
- piiType: one of ${typesList}
- value: the exact substring of the detected PII (REQUIRED)
- confidence: number between 0 and 1 (REQUIRED). Use for how sure you are this is PII (e.g. 0.95 for clear match, 0.6 for ambiguous).

Example format:
[
  {
    "piiType": "email",
    "value": "john.doe@example.com",
    "confidence": 0.95
  }
]

Return only valid JSON, no additional text. If no PII is found, return an empty array [].`;
}
