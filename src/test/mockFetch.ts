import { vi } from 'vitest';

/** What a mocked URL answers with: JSON data, an HTTP status to fail with, or a thrown error. */
export type MockReply = { json: unknown } | { status: number } | { error: Error };

type Route = MockReply | (() => MockReply);

function toResponse(reply: MockReply): Promise<Response> {
  if ('error' in reply) return Promise.reject(reply.error);
  if ('status' in reply) return Promise.resolve(new Response('error', { status: reply.status }));
  // A Response body can be read once, so build a fresh one per call.
  return Promise.resolve(Response.json(reply.json));
}

/**
 * Replaces `fetch` for one test. Keys are URL fragments; the first key contained in the
 * requested URL answers. A function route is called per request, so a test can change the
 * answer over time. Unmatched requests stay pending forever (the section keeps loading).
 */
export function mockFetch(routes: Record<string, Route>) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = input instanceof Request ? input.url : String(input);
    const route = Object.entries(routes).find(([fragment]) => url.includes(fragment))?.[1];
    if (!route) return new Promise<Response>(() => {});
    return toResponse(typeof route === 'function' ? route() : route);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The URLs requested so far, for asserting on what was (or was not) fetched. */
export function requestedUrls(fetchMock: ReturnType<typeof mockFetch>): string[] {
  return fetchMock.mock.calls.map(([input]) =>
    input instanceof Request ? input.url : String(input),
  );
}
