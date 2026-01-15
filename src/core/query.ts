/**
 * Builds a query string from params, filtering out undefined/null values.
 * Returns empty string if no params, otherwise returns `?key=value&...`
 */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  const searchParams = new URLSearchParams();
  for (const [k, v] of entries) {
    searchParams.set(k, String(v));
  }
  return `?${searchParams.toString()}`;
}
