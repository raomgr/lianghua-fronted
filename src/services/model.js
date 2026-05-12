import { http } from "./http";

export function fetchModelStatus() {
  return http.get("/api/model/status");
}

export function fetchModelDetail() {
  return http.get("/api/model/detail");
}

export function fetchModelCompare() {
  return http.get("/api/model/compare");
}

export function fetchModelRuns() {
  return http.get("/api/model/runs");
}

export function fetchPredictions() {
  return http.get("/api/model/predictions");
}

export function triggerModelTrain() {
  return http.post("/api/model/train");
}

export function fetchModelTrainJob(jobId) {
  return http.get(`/api/model/train/${jobId}`);
}
