import { fetchJson, type FetchWithRetryOptions, type FetchFn } from "../core/http";
import { ApiError } from "../core/errors";
import type { ZodType } from "zod";
import { TIMING_CONSTANTS } from "../core/network";

export interface RestContext {
  restUrl: string;
  fetchFn?: FetchFn;
  fetchOptions?: FetchWithRetryOptions;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function buildFetchOptions(
  context: RestContext,
  overrides?: FetchWithRetryOptions,
): FetchWithRetryOptions {
  return {
    timeout: TIMING_CONSTANTS.API_TIMEOUT_MS,
    retries: 3,
    ...context.fetchOptions,
    ...overrides,
  };
}

export async function fetchRest<T>(
  context: RestContext,
  path: string,
  fetchOptions?: FetchWithRetryOptions,
  schema?: ZodType<T>,
): Promise<T> {
  const baseUrl = normalizeBaseUrl(context.restUrl);
  const url = `${baseUrl}${path}`;
  const options = buildFetchOptions(context, fetchOptions);
  const data = await fetchJson<unknown>(url, {}, options, context.fetchFn);
  if (!schema) {
    return data as T;
  }
  return parseRestResponse(schema, data, url);
}

export function parseRestResponse<T>(schema: ZodType<T>, data: unknown, url: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(`Invalid API response from ${url}: ${parsed.error.message}`);
  }
  return parsed.data;
}
