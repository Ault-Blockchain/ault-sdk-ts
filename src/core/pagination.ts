import { fetchJson, type FetchWithRetryOptions, type FetchFn } from "./http";
import { ApiError } from "./errors";

export interface PaginateAllOptions<TResponse, TItem, TCursor> {
  buildUrl: (cursor: TCursor | null) => string;
  getItems: (response: TResponse) => TItem[];
  getNextCursor: (response: TResponse) => TCursor | null;
  getTotal?: (response: TResponse) => number;
  parseResponse?: (response: unknown, url: string) => TResponse;
  fetchOptions?: FetchWithRetryOptions;
  fetchFn?: FetchFn;
}

export async function paginateAll<TResponse, TItem, TCursor>(
  options: PaginateAllOptions<TResponse, TItem, TCursor>,
): Promise<{ items: TItem[]; total: number }> {
  const allItems: TItem[] = [];
  let cursor: TCursor | null = null;
  const seenCursors = new Set<TCursor>();
  let total = 0;
  let isFirstPage = true;

  while (true) {
    const url = options.buildUrl(cursor);
    const rawResponse = await fetchJson<unknown>(url, {}, options.fetchOptions, options.fetchFn);
    const response = options.parseResponse
      ? options.parseResponse(rawResponse, url)
      : (rawResponse as TResponse);

    const items = options.getItems(response);
    allItems.push(...items);

    if (isFirstPage && options.getTotal) {
      total = options.getTotal(response);
      isFirstPage = false;
    }

    const nextCursor = options.getNextCursor(response);
    if (nextCursor === null || items.length === 0) {
      break;
    }

    if (nextCursor === cursor || seenCursors.has(nextCursor)) {
      throw new ApiError(
        `Pagination cursor repeated while fetching ${url}; aborting to prevent infinite loop`,
      );
    }

    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  if (!options.getTotal) {
    total = allItems.length;
  }

  return { items: allItems, total };
}
