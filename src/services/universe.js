import { http } from "./http";

export function fetchCustomUniverse(params = {}) {
  return http.get("/api/universe/custom", {
    params: {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    },
  });
}

export function fetchUniverseSearch(query, params = {}) {
  return http.get("/api/universe/search", {
    params: {
      q: query,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 6,
    },
  });
}

export function saveCustomUniverse(symbols, items = []) {
  return http.post("/api/universe/custom", { symbols, items });
}
