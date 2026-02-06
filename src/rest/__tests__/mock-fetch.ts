import { vi, type Mock } from "vitest";

export interface MockResponse {
  status?: number;
  statusText?: string;
  ok?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
}

export type MockFetch = Mock<[url: string, init?: RequestInit], Promise<Response>> & {
  (url: string, init?: RequestInit): Promise<Response>;
};

export function createMockFetch(responses: MockResponse | MockResponse[] = { body: {} }): MockFetch {
  const responseQueue = Array.isArray(responses) ? [...responses] : [responses];
  let callIndex = 0;

  return vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
    const responseConfig = responseQueue[Math.min(callIndex++, responseQueue.length - 1)];
    const status = responseConfig.status ?? 200;
    const ok = responseConfig.ok ?? (status >= 200 && status < 300);

    return {
      ok,
      status,
      statusText: responseConfig.statusText ?? (ok ? "OK" : "Error"),
      headers: new Headers(responseConfig.headers ?? {}),
      json: async () => responseConfig.body,
      text: async () => JSON.stringify(responseConfig.body),
      clone: () => ({ json: async () => responseConfig.body }) as Response,
    } as Response;
  }) as MockFetch;
}

export function mockJsonResponse<T>(body: T, status = 200): MockResponse {
  return { body, status, ok: status >= 200 && status < 300 };
}

export function mockErrorResponse(status: number, body?: unknown): MockResponse {
  return { body: body ?? { error: "Error" }, status, ok: false };
}

export function mockNotFoundResponse(body?: unknown): MockResponse {
  return mockErrorResponse(404, body ?? { code: 5, message: "not found" });
}
