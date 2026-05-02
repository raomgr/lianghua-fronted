import { inject } from "vue";

export const dashboardKey = Symbol("dashboard");

export function useDashboardContext() {
  const dashboard = inject(dashboardKey, null);
  if (!dashboard) {
    throw new Error("Dashboard context is not available.");
  }
  return dashboard;
}
