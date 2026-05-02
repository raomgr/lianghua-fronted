import { createRouter, createWebHistory } from "vue-router";
import DashboardLayout from "../layouts/DashboardLayout.vue";
import ModelsPage from "../pages/dashboard/ModelsPage.vue";
import OverviewPage from "../pages/dashboard/OverviewPage.vue";
import PaperPage from "../pages/dashboard/PaperPage.vue";
import ResearchPage from "../pages/dashboard/ResearchPage.vue";
import SignalsPage from "../pages/dashboard/SignalsPage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: DashboardLayout,
      children: [
        { path: "", redirect: "/overview" },
        { path: "overview", component: OverviewPage },
        { path: "research", component: ResearchPage },
        { path: "models", component: ModelsPage },
        { path: "signals", component: SignalsPage },
        { path: "paper", component: PaperPage },
      ],
    },
  ],
});

export default router;
