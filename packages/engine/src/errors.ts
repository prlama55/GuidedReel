export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'MISSING_ASSET'
  | 'UNSUPPORTED_MEDIA'
  | 'INVALID_DURATION'
  | 'INVALID_FORMAT'
  | 'MISSING_FONT'
  | 'CORRUPT_FILE'
  | 'FILE_TOO_LARGE'
  | 'IMPORT_FAILED'
  | 'NOT_FOUND'
  | 'IO_ERROR'
  | 'RENDER_FAILED'
  | 'RENDER_CANCELLED'
  | 'INSUFFICIENT_DISK_SPACE'
  | 'UNSUPPORTED_CODEC'
  | 'UNKNOWN';

export type ErrorDetails = Record<string, unknown>;

/**
 * Structured error used across all packages. UIs switch on `code`, log `details`,
 * and show `message` to the user.
 */
export class VideoCreatorError extends Error {
  public readonly code: ErrorCode;
  public readonly details: ErrorDetails;
  public readonly retryable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    options: { details?: ErrorDetails; cause?: unknown; retryable?: boolean } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'VideoCreatorError';
    this.code = code;
    this.details = options.details ?? {};
    this.retryable = options.retryable ?? false;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
    };
  }
}

export function isVideoCreatorError(err: unknown): err is VideoCreatorError {
  return (
    err instanceof VideoCreatorError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { name?: string }).name === 'VideoCreatorError')
  );
}

/** Wraps any thrown value into a VideoCreatorError without losing information. */
export function toVideoCreatorError(
  err: unknown,
  fallbackCode: ErrorCode = 'UNKNOWN',
): VideoCreatorError {
  if (err instanceof VideoCreatorError) return err;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (/enospc|no space left/.test(msg))
      return new VideoCreatorError('INSUFFICIENT_DISK_SPACE', 'Not enough disk space to finish', {
        cause: err,
      });
    if (/abort|cancel/.test(msg))
      return new VideoCreatorError('RENDER_CANCELLED', 'Render was cancelled', { cause: err });
    if (/enoent|not found/.test(msg))
      return new VideoCreatorError('NOT_FOUND', err.message, { cause: err });
    if (/codec/.test(msg))
      return new VideoCreatorError('UNSUPPORTED_CODEC', err.message, { cause: err });
    return new VideoCreatorError(fallbackCode, err.message, { cause: err });
  }
  return new VideoCreatorError(fallbackCode, String(err));
}

/** Serializable shape for IPC / HTTP. */
export type SerializedError = {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
  retryable?: boolean;
};

export function serializeError(err: unknown): SerializedError {
  const e = toVideoCreatorError(err);
  return { code: e.code, message: e.message, details: e.details, retryable: e.retryable };
}

export function deserializeError(s: SerializedError): VideoCreatorError {
  return new VideoCreatorError(s.code, s.message, { details: s.details, retryable: s.retryable });
}
