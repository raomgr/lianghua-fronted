import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      return Promise.reject(new Error(`Request failed: ${error.response.status}`));
    }
    if (error.request) {
      return Promise.reject(new Error("Network request failed"));
    }
    return Promise.reject(error);
  },
);
