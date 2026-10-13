export type SearchFilters = {
  query: string;
  radius: string;
  hasPhone: boolean;
  sort: string;
};
export const defaultSearchFilters: SearchFilters = {
  query: "",
  radius: "10",
  hasPhone: false,
  sort: "distance",
};
const distances = new Set(["2", "5", "10", "20"]);

export function readSearchFilters(search: string): SearchFilters {
  const params = new URLSearchParams(search);
  return {
    query: (params.get("q") ?? "").slice(0, 150),
    radius: distances.has(params.get("radius") ?? "")
      ? params.get("radius")!
      : "10",
    hasPhone: params.get("phone") === "1",
    sort: params.get("sort") === "name" ? "name" : "distance",
  };
}

/** Filter URLs contain no new GPS coordinates; existing explicitly shared parameters are retained. */
export function searchFilterUrl(
  current: string,
  filters: SearchFilters,
): string {
  const url = new URL(current);
  const values = {
    q: filters.query,
    radius: filters.radius === "10" ? "" : filters.radius,
    phone: filters.hasPhone ? "1" : "",
    sort: filters.sort === "name" ? "name" : "",
  };
  for (const [key, value] of Object.entries(values))
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  return url.pathname + url.search + url.hash;
}
