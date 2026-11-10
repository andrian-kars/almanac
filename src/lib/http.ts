/**
 * One way to call a JSON API: typed errors for each failure mode, so the UI can show
 * a precise message and the query layer can decide what is worth retrying.
 */

/** The server answered, but not with success. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }

  /** Server-side failures may be temporary; client errors (4xx) will not fix themselves. */
  get isRetryable(): boolean {
    return this.status >= 500;
  }
}

/** The request never got an answer: offline, DNS failure, blocked by CORS, etc. */
export class NetworkError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Network request failed', options);
    this.name = 'NetworkError';
  }
}

/** The answer arrived but could not be understood (not JSON, or an unexpected shape). */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

type FetchJsonInit = { signal?: AbortSignal; headers?: Record<string, string> };

/** Checked by name: browsers, Node and jsdom each have their own DOMException class. */
const isAbort = (error: unknown) =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';

/**
 * GETs `url` and returns the parsed body as `unknown`: callers must validate it before use.
 * An aborted request rethrows the original AbortError, which the query layer ignores.
 */
export async function fetchJson(url: string, init?: FetchJsonInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new NetworkError({ cause: error });
  }

  if (!response.ok) throw new HttpError(response.status);

  try {
    return (await response.json()) as unknown;
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new ParseError('Response body is not valid JSON');
  }
}

/** Whether a failed request is worth one automatic retry. */
export function isRetryable(error: unknown): boolean {
  return error instanceof NetworkError || (error instanceof HttpError && error.isRetryable);
}

/** A short, user-facing explanation of a failed request. Never exposes internal details. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'Could not reach the service. Check your connection and try again.';
  }
  if (error instanceof HttpError) {
    if (error.status === 429) return 'Too many requests right now. Wait a moment and try again.';
    if (error.status === 404) return 'Nothing was found for this date.';
    if (error.status >= 500) return 'The service is having problems. Try again in a moment.';
  }
  if (error instanceof ParseError) return 'The service sent an unexpected response.';
  return 'This section could not be loaded.';
}
