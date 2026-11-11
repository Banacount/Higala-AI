/**
 * Errors raised by the community API.
 *
 * `status` is the HTTP status the adapter should return, and `code` is a stable
 * machine-readable value the client can branch on (for example to open the
 * guidelines modal when `guidelines_required` comes back).
 */
export class CommunityError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = 'community_error') {
    super(message);
    this.name = 'CommunityError';
    this.status = status;
    this.code = code;
  }
}

export class CommunityAuthError extends CommunityError {
  constructor(message = 'Sign in is required to use the community.') {
    super(message, 401, 'auth_required');
    this.name = 'CommunityAuthError';
  }
}

export class CommunityForbiddenError extends CommunityError {
  constructor(message = 'You do not have permission to do that.') {
    super(message, 403, 'forbidden');
    this.name = 'CommunityForbiddenError';
  }
}

export class CommunityNotFoundError extends CommunityError {
  constructor(message = 'That community post is no longer available.') {
    super(message, 404, 'not_found');
    this.name = 'CommunityNotFoundError';
  }
}

export class CommunityConflictError extends CommunityError {
  constructor(message: string, code = 'conflict') {
    super(message, 409, code);
    this.name = 'CommunityConflictError';
  }
}

export class CommunityRateLimitError extends CommunityError {
  constructor(message: string) {
    super(message, 429, 'rate_limited');
    this.name = 'CommunityRateLimitError';
  }
}

export class CommunityConfigError extends CommunityError {
  constructor(
    message = 'The community service is not configured yet. Add Firebase Admin credentials to the server environment.',
  ) {
    super(message, 503, 'not_configured');
    this.name = 'CommunityConfigError';
  }
}
