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

export function fetchModelRuns(params = {}) {
  return http.get("/api/model/runs", {
    params: {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 6,
    },
  });
}

export function fetchPredictions(params = {}) {
  return http.get("/api/model/predictions", {
    params: {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 24,
    },
  });
}

export function triggerModelTrain() {
  return http.post("/api/model/train");
}

export function fetchModelTrainJob(jobId) {
  return http.get(`/api/model/train/${jobId}`);
}
