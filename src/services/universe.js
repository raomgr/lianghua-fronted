import { http } from "./http";

export function fetchCustomUniverse() {
  return http.get("/api/universe/custom");
}

export function fetchUniverseSearch(query) {
  return http.get("/api/universe/search", {
    params: { q: query },
  });
}

export function saveCustomUniverse(symbols, items = []) {
  return http.post("/api/universe/custom", { symbols, items });
}
