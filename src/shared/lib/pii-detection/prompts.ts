import type { PiiType } from 'src/shared/config/env/server';

/**
 * PII type descriptions for prompts
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
 * Build system prompt for PII detection
 */
export function buildSystemPrompt(enabledPiiTypes: PiiType[]): string {
    const enabledTypes = enabledPiiTypes.map((type) => `- ${type}: ${PII_TYPE_DESCRIPTIONS[type]}`).join('\n');

    return `You are a PII detection system. Your task is to identify Personally Identifiable Information (PII) in text.

PII types to detect:
${enabledTypes}

Rules:
1. Only detect PII that is clearly identifiable (high confidence)
2. Avoid false positives (e.g., "Call me at 5PM" is not a phone number)
3. Handle partial PII that may span across chunks
4. Return exact character offsets (0-indexed, endOffset is exclusive)
5. Use appropriate placeholders: [EMAIL], [PHONE], [SSN], [CREDIT_CARD], [ADDRESS], [NAME], [GOV_ID], [IP], [DOB]

Return results as JSON array only, no markdown or explanation.`;
}

/**
 * Build user prompt for PII detection
 */
export function buildDetectionPrompt(text: string, enabledPiiTypes: PiiType[]): string {
    const typesList = enabledPiiTypes.join(', ');
    return `Analyze the following text and detect all instances of Personally Identifiable Information (PII).

PII types to detect: ${typesList}

Text to analyze:
"""
${text}
"""

Return a JSON array of detected PII instances. Each instance should have:
- piiType: one of ${typesList}
- value: the exact text of the detected PII (REQUIRED)
- startOffset: character position where PII starts (0-indexed)
- endOffset: character position where PII ends (exclusive, 0-indexed)
- placeholder: a placeholder like "[EMAIL]", "[PHONE]", "[SSN]", etc.
- confidence: optional number between 0 and 1

Example format:
[
  {
    "piiType": "email",
    "value": "john.doe@example.com",
    "startOffset": 12,
    "endOffset": 32,
    "placeholder": "[EMAIL]",
    "confidence": 0.95
  }
]

Return only valid JSON, no additional text. If no PII is found, return an empty array [].`;
}
