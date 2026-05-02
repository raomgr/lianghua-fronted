<script setup>
import ModelWorkspace from "../../components/dashboard/ModelWorkspace.vue";
import RoadmapPanel from "../../components/dashboard/RoadmapPanel.vue";
import { useDashboardContext } from "../../composables/useDashboardContext";

const dashboard = useDashboardContext();
</script>

<template>
  <template v-if="dashboard.loading && (!dashboard.backtest || !dashboard.modelStatus)">
    加载中...
  </template>

  <template v-else-if="!dashboard.backtest || !dashboard.modelStatus">
    接口请求失败：{{ dashboard.error || "核心数据暂时不可用" }}
  </template>

  <template v-else>
    <p v-if="dashboard.error" class="subtle-caption">部分接口更新失败：{{ dashboard.error }}</p>

    <ModelWorkspace
      :model-compare="dashboard.modelCompare"
      :model-detail="dashboard.modelDetail"
      :walk-forward-summary="dashboard.walkForwardSummary"
      :model-runs="dashboard.modelRuns"
    />

    <RoadmapPanel />
  </template>
</template>
