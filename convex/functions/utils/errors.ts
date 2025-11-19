/**
 * Error handling utilities with actionable error messages for better UX
 */

/**
 * Custom error class with actionable messages
 */
export class ActionableError extends Error {
  constructor(
    message: string,
    public action?: string,
    public code?: string
  ) {
    super(message);
    this.name = "ActionableError";
  }
}

/**
 * Create authentication error with actionable message
 */
export function createAuthError(): ActionableError {
  return new ActionableError(
    "Please sign in to continue. Click 'Sign In' to authenticate with your Google account.",
    "Sign in with Google",
    "AUTH_REQUIRED"
  );
}

/**
 * Create not found error with actionable message
 */
export function createNotFoundError(
  resourceType: string,
  resourceId?: string,
  suggestion?: string
): ActionableError {
  const message = resourceId
    ? `The ${resourceType} you're looking for doesn't exist or may have been deleted.`
    : `No ${resourceType} found.`;
  
  const action = suggestion || `Please check the ${resourceType} ID or try refreshing the page.`;
  
  return new ActionableError(message, action, "NOT_FOUND");
}

/**
 * Create authorization error with actionable message
 */
export function createAuthorizationError(
  resourceType: string,
  action: string
): ActionableError {
  return new ActionableError(
    `You don't have permission to ${action} this ${resourceType}.`,
    `You can only ${action} ${resourceType}s that belong to you. Please check that you're signed in with the correct account.`,
    "UNAUTHORIZED"
  );
}

/**
 * Create validation error with actionable message
 */
export function createValidationError(
  field: string,
  reason: string,
  suggestion?: string
): ActionableError {
  return new ActionableError(
    `Invalid ${field}: ${reason}`,
    suggestion || `Please check the ${field} and try again.`,
    "VALIDATION_ERROR"
  );
}

/**
 * Create dependency error (e.g., can't delete because of related records)
 */
export function createDependencyError(
  resourceType: string,
  dependentResourceType: string,
  action: string
): ActionableError {
  return new ActionableError(
    `Cannot ${action} ${resourceType}: There are ${dependentResourceType} associated with it.`,
    `Please delete or reassign all ${dependentResourceType} first, then try again.`,
    "DEPENDENCY_ERROR"
  );
}

/**
 * Create external API error with actionable message
 */
export function createExternalAPIError(
  service: string,
  action: string,
  retryable: boolean = true
): ActionableError {
  const message = `Unable to ${action} using ${service}.`;
  const actionMessage = retryable
    ? `This is usually temporary. Please try again in a few moments. If the problem persists, check your internet connection.`
    : `Please check your ${service} configuration or contact support if the issue continues.`;
  
  return new ActionableError(message, actionMessage, "EXTERNAL_API_ERROR");
}

/**
 * Create rate limit error
 */
export function createRateLimitError(service: string, retryAfter?: number): ActionableError {
  const message = `Too many requests to ${service}.`;
  const action = retryAfter
    ? `Please wait ${retryAfter} seconds before trying again.`
    : `Please wait a few moments before trying again.`;
  
  return new ActionableError(message, action, "RATE_LIMIT");
}

/**
 * Create embedding generation error
 */
export function createEmbeddingError(): ActionableError {
  return new ActionableError(
    "Failed to generate embedding for search. Your content has been saved, but semantic search may not work until this is resolved.",
    "This usually resolves automatically. If the problem persists, try editing the content slightly to trigger a new embedding generation.",
    "EMBEDDING_ERROR"
  );
}

/**
 * Create content generation error
 */
export function createContentGenerationError(step: string): ActionableError {
  return new ActionableError(
    `Failed to generate content during ${step}.`,
    `Please try again. If the problem continues, try simplifying your request or check your internet connection.`,
    "CONTENT_GENERATION_ERROR"
  );
}

/**
 * Format error for frontend consumption
 */
export function formatError(error: unknown): { message: string; action?: string; code?: string } {
  if (error instanceof ActionableError) {
    return {
      message: error.message,
      action: error.action,
      code: error.code,
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      code: "UNKNOWN_ERROR",
    };
  }
  
  return {
    message: "An unexpected error occurred. Please try again.",
    action: "If the problem persists, please refresh the page or contact support.",
    code: "UNKNOWN_ERROR",
  };
}

