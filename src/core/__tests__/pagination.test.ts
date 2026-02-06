import { describe, it, expect, vi } from "vitest";
import { paginateAll } from "../pagination";

interface CursorPage {
  values: string[];
  pagination?: { next_key?: string | null };
}

function mockJsonResponse(body: unknown, status = 200): Response {
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("paginateAll", () => {
  it("collects all items across pages", async () => {
    const fetchFn = vi
      .fn<[url: string, init?: RequestInit], Promise<Response>>()
      .mockResolvedValueOnce(mockJsonResponse({ values: ["1", "2"], pagination: { next_key: "a" } }))
      .mockResolvedValueOnce(mockJsonResponse({ values: ["3"], pagination: { next_key: "" } }));

    const result = await paginateAll<CursorPage, string, string>({
      buildUrl: (cursor) =>
        `https://api.example.com/items${cursor ? `?pagination.key=${cursor}` : ""}`,
      getItems: (response) => response.values,
      getNextCursor: (response) => response.pagination?.next_key || null,
      fetchFn,
      fetchOptions: { retries: 0 },
    });

    expect(result.items).toEqual(["1", "2", "3"]);
    expect(result.total).toBe(3);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("throws when cursor repeats to avoid infinite loops", async () => {
    const fetchFn = vi
      .fn<[url: string, init?: RequestInit], Promise<Response>>()
      .mockResolvedValueOnce(mockJsonResponse({ values: ["1"], pagination: { next_key: "a" } }))
      .mockResolvedValueOnce(mockJsonResponse({ values: ["2"], pagination: { next_key: "a" } }))
      .mockResolvedValueOnce(mockJsonResponse({ values: ["3"], pagination: { next_key: "" } }));

    await expect(
      paginateAll<CursorPage, string, string>({
        buildUrl: (cursor) =>
          `https://api.example.com/items${cursor ? `?pagination.key=${cursor}` : ""}`,
        getItems: (response) => response.values,
        getNextCursor: (response) => response.pagination?.next_key || null,
        fetchFn,
        fetchOptions: { retries: 0 },
      }),
    ).rejects.toThrow("Pagination cursor repeated");

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
