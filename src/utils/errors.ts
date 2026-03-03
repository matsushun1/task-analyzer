export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class NotionAPIError extends AppError {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message, 500);
  }
}

export class BlockFetchError extends NotionAPIError {
  constructor(
    public readonly pageId: string,
    originalError?: unknown
  ) {
    super(`Failed to fetch blocks for page: ${pageId}`, originalError);
  }
}

export class ClaudeAPIError extends AppError {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message, 500);
  }
}
