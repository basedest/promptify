export class ConversationNotFoundError extends Error {
    readonly code = 'CONVERSATION_NOT_FOUND';
}

export class ForbiddenError extends Error {
    readonly code = 'FORBIDDEN';
}

export class RateLimitExceededError extends Error {
    readonly code = 'RATE_LIMIT_EXCEEDED';
}

export class QuotaExceededError extends Error {
    readonly code = 'QUOTA_EXCEEDED';
}

export class ValidationError extends Error {
    readonly code = 'VALIDATION';
}
