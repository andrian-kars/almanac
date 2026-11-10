import { describe, expect, it, vi } from 'vitest';
import { fetchJson, getErrorMessage, HttpError, NetworkError, ParseError } from './http';

function stubFetch(response: Response | Error | DOMException) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    response instanceof Response ? Promise.resolve(response) : Promise.reject(response),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchJson', () => {
  it('returns the parsed JSON body of a successful response', async () => {
    stubFetch(Response.json({ hello: 'world' }));

    await expect(fetchJson('https://example.test/data')).resolves.toEqual({ hello: 'world' });
  });

  it('passes the URL, abort signal and headers to fetch', async () => {
    const fetchMock = stubFetch(Response.json({}));
    const { signal } = new AbortController();

    await fetchJson('https://example.test/data', { signal, headers: { 'Api-User-Agent': 'x' } });

    expect(fetchMock).toHaveBeenCalledWith('https://example.test/data', {
      signal,
      headers: { 'Api-User-Agent': 'x' },
    });
  });

  it.each([400, 404, 429, 500, 503])('throws an HttpError carrying status %d', async (status) => {
    stubFetch(new Response('nope', { status }));

    const error = await fetchJson('https://example.test/data').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(status);
  });

  it('throws a NetworkError when the request never reaches the server', async () => {
    stubFetch(new TypeError('Failed to fetch'));

    await expect(fetchJson('https://example.test/data')).rejects.toBeInstanceOf(NetworkError);
  });

  it('lets an abort pass through untouched, so cancelled requests are not reported', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    stubFetch(abort);

    await expect(fetchJson('https://example.test/data')).rejects.toBe(abort);
  });

  it('throws a ParseError when a successful response is not JSON', async () => {
    stubFetch(new Response('<html>gateway</html>', { status: 200 }));

    await expect(fetchJson('https://example.test/data')).rejects.toBeInstanceOf(ParseError);
  });
});

describe('getErrorMessage', () => {
  it.each([
    [new NetworkError(), /connection/i],
    [new HttpError(429), /too many requests/i],
    [new HttpError(404), /nothing was found/i],
    [new HttpError(500), /having problems/i],
    [new HttpError(503), /having problems/i],
    [new HttpError(400), /could not be loaded/i],
    [new ParseError('bad shape'), /unexpected/i],
    [new Error('anything else'), /could not be loaded/i],
    ['not even an error', /could not be loaded/i],
  ])('describes %o in plain words', (error, expected) => {
    expect(getErrorMessage(error)).toMatch(expected);
  });

  it('never leaks internal error text', () => {
    expect(getErrorMessage(new Error('secret stack detail'))).not.toMatch(/secret/);
  });
});

describe('HttpError', () => {
  it.each([
    [400, false],
    [404, false],
    [429, false],
    [500, true],
    [503, true],
  ])('status %d retryable: %s', (status, expected) => {
    expect(new HttpError(status).isRetryable).toBe(expected);
  });
});
