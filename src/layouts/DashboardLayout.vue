<script setup>
import { provide, reactive } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { useDashboard } from "../composables/useDashboard";
import { dashboardKey } from "../composables/useDashboardContext";

const dashboard = reactive(useDashboard());

provide(dashboardKey, dashboard);

const navItems = [
  { to: "/overview", label: "总览" },
  { to: "/research", label: "股票研究" },
  { to: "/models", label: "模型分析" },
  { to: "/signals", label: "实盘信号" },
  { to: "/paper", label: "Paper Trading" },
];
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">A-Share Quant Dashboard</p>
        <!--<h1 class="app-title">A 股量化研究台</h1>-->
        <h1 class="app-title">A 股量化工作台</h1>
      </div>
      <nav class="app-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          active-class="active"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </header>

    <RouterView />
  </main>
</template>
