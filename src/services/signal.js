import { http } from "./http";

export function fetchSignalCenter() {
  return http.get("/api/signals/center");
}

export function fetchSignalHistory(params = {}) {
  return http.get("/api/signals/history", {
    params: {
      page: params.page ?? 1,
      page_size: params.pageSize ?? params.limit ?? 12,
    },
  });
}

export function saveSignalReview(payload = {}) {
  return http.post("/api/signals/review", payload);
}
