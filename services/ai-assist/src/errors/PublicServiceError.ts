/**
 * An error whose message is safe to show to the end user, as opposed to an
 * unexpected failure (SDK internals, network errors) that the HTTP error
 * handler must mask. Carries its own HTTP status code.
 */
export class PublicServiceError extends Error {
  readonly isPublic = true;

  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "PublicServiceError";
  }
}

export function isPublicServiceError(error: unknown): error is PublicServiceError {
  return error instanceof PublicServiceError;
}
