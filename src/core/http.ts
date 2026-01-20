import { ApiError, NetworkError, TimeoutError } from "./errors";

/** A minimal fetch function signature that we use throughout the SDK */
export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface FetchWithRetryOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  retryableMethods?: string[];
  retryableStatuses?: number[];
  retryOnTimeout?: boolean;
}

const DEFAULT_OPTIONS: Required<FetchWithRetryOptions> = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryableMethods: ["GET", "HEAD", "OPTIONS"],
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryOnTimeout: false,
};

function ensureFetch(fetchFn?: FetchFn): FetchFn {
  const resolved = fetchFn ?? globalThis.fetch;
  if (!resolved) {
    throw new NetworkError("Global fetch is not available. Provide a fetch implementation.");
  }
  return resolved;
}

async function fetchWithTimeout(
  fetchFn: FetchFn,
  url: string,
  options: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);
  let removeAbortListener: (() => void) | undefined;

  if (options.signal) {
    const callerSignal = options.signal;
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      const onAbort = () => {
        clearTimeout(timeoutId);
        controller.abort();
      };
      callerSignal.addEventListener("abort", onAbort, { once: true });
      removeAbortListener = () => callerSignal.removeEventListener("abort", onAbort);
    }
  }

  try {
    return await fetchFn(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (timedOut) {
        throw new TimeoutError(`Request to ${url} timed out after ${timeout}ms`);
      }
      throw error;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    removeAbortListener?.();
  }
}

function calculateDelay(attempt: number, baseDelay: number, exponential: boolean): number {
  if (exponential) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 30000);
  }
  return baseDelay;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  fetchOptions: FetchWithRetryOptions = {},
  fetchFn?: FetchFn,
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...fetchOptions };
  const method = (options.method || "GET").toUpperCase();
  const canRetry = opts.retryableMethods.includes(method);
  const resolvedFetch = ensureFetch(fetchFn);
  const isAbortError = (error: unknown): error is Error =>
    error instanceof Error && error.name === "AbortError";

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      const response = await fetchWithTimeout(resolvedFetch, url, options, opts.timeout);

      if (
        !response.ok &&
        canRetry &&
        opts.retryableStatuses.includes(response.status) &&
        attempt < opts.retries
      ) {
        const delay = calculateDelay(attempt, opts.retryDelay, opts.exponentialBackoff);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (isAbortError(error)) {
        throw error;
      }

      if (!canRetry || attempt >= opts.retries) {
        break;
      }

      if (error instanceof TimeoutError && !opts.retryOnTimeout) {
        break;
      }

      const delay = calculateDelay(attempt, opts.retryDelay, opts.exponentialBackoff);
      await sleep(delay);
    }
  }

  if (lastError instanceof TimeoutError) {
    throw lastError;
  }

  throw new NetworkError(
    `Failed to fetch ${url}: ${lastError?.message || "Unknown error"}`,
    lastError || undefined,
  );
}

export async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
  fetchOptions: FetchWithRetryOptions = {},
  fetchFn?: FetchFn,
): Promise<T> {
  const response = await fetchWithRetry(url, options, fetchOptions, fetchFn);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      errorText,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ApiError("Failed to parse JSON response", response.status);
  }
}

export async function postJson<T, R>(
  url: string,
  data: T,
  fetchOptions: FetchWithRetryOptions = {},
  fetchFn?: FetchFn,
): Promise<R> {
  return fetchJson<R>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    {
      ...fetchOptions,
      retryableMethods: ["POST", ...(fetchOptions.retryableMethods || [])],
    },
    fetchFn,
  );
}
