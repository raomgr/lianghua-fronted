import { http } from "./http";

export function fetchSignalCenter() {
  return http.get("/api/signals/center");
}

export function fetchSignalHistory(params = {}) {
  return http.get("/api/signals/history", { params });
}

export function saveSignalReview(payload = {}) {
  return http.post("/api/signals/review", payload);
}
