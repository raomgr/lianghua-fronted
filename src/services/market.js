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

export function fetchStockHistory(symbol, params = {}) {
  return http.get(`/api/stocks/${symbol}/history`, { params });
}

export function triggerUpdate() {
  return http.post("/api/tasks/update");
}
