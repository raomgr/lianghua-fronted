import { http } from "./http";

export function fetchPaperAccount() {
  return http.get("/api/paper/account");
}

export function resetPaperAccount(payload = {}) {
  return http.post("/api/paper/reset", payload);
}

export function previewPaperRebalance(payload = {}) {
  return http.post("/api/paper/rebalance/preview", payload);
}

export function executePaperRebalance(payload = {}) {
  return http.post("/api/paper/rebalance", payload);
}

export function rejectPaperRebalancePreview(payload = {}) {
  return http.post("/api/paper/rebalance/reject", payload);
}

export function retryPaperOrder(payload = {}) {
  return http.post("/api/paper/orders/retry", payload);
}

export function cancelPaperOrder(payload = {}) {
  return http.post("/api/paper/orders/cancel", payload);
}

export function updatePaperDailySettings(payload = {}) {
  return http.post("/api/paper/daily/settings", payload);
}

export function runPaperDailyCycle(payload = {}) {
  return http.post("/api/paper/daily/run", payload);
}
