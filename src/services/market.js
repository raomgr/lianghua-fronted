import { http } from "./http";

export function fetchStocks() {
  return http.get("/api/stocks");
}

export function fetchFactors() {
  return http.get("/api/factors");
}

export function fetchBacktest(params = {}) {
  return http.get("/api/backtest", { params });
}

export function fetchBacktestSensitivity(params = {}) {
  return http.get("/api/backtest/sensitivity", { params });
}

export function fetchBacktestStability(params = {}) {
  return http.get("/api/backtest/stability", { params });
}

export function fetchBacktestMonteCarlo(params = {}) {
  return http.get("/api/backtest/montecarlo", { params });
}

export function fetchBacktestScenarios(params = {}) {
  return http.get("/api/backtest/scenarios", { params });
}

export function fetchBacktestPresets(params = {}) {
  return http.get("/api/backtest/presets", {
    params: {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 50,
      tag: params.tag ?? "全部",
    },
  });
}

export function createBacktestPreset(payload = {}) {
  return http.post("/api/backtest/presets", payload);
}

export function updateBacktestPreset(presetId, payload = {}) {
  return http.patch(`/api/backtest/presets/${presetId}`, payload);
}

export function useBacktestPreset(presetId) {
  return http.post(`/api/backtest/presets/${presetId}/use`);
}

export function deleteBacktestPreset(presetId) {
  return http.delete(`/api/backtest/presets/${presetId}`);
}

export function setDefaultBacktestPreset(presetId) {
  return http.post(`/api/backtest/presets/${presetId}/default`);
}

export function addBacktestPresetTag(tag) {
  return http.post("/api/backtest/preset-tags", { tag });
}

export function removeBacktestPresetTag(tag) {
  return http.delete(`/api/backtest/preset-tags/${encodeURIComponent(tag)}`);
}

export function fetchBacktestRunHistory(params = {}) {
  return http.get("/api/backtest/history", {
    params: {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 50,
    },
  });
}

export function createBacktestRunHistory(payload = {}) {
  return http.post("/api/backtest/history", payload);
}

export function clearBacktestRunHistory() {
  return http.delete("/api/backtest/history");
}

export function fetchStockHistory(symbol, params = {}) {
  return http.get(`/api/stocks/${symbol}/history`, { params });
}

export function triggerUpdate() {
  return http.post("/api/tasks/update");
}
