<script setup>
import StockResearchSection from "../../components/dashboard/StockResearchSection.vue";
import StockTablePanel from "../../components/dashboard/StockTablePanel.vue";
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

    <StockResearchSection
      :selected-stock="dashboard.selectedStock"
      :visible-history="dashboard.visibleHistory"
      :selected-history-stats="dashboard.selectedHistoryStats"
      :selected-factor-cards="dashboard.selectedFactorCards"
      :selected-history-range="dashboard.selectedHistoryRange"
      :selected-chart-mode="dashboard.selectedChartMode"
      :selected-indicator="dashboard.selectedIndicator"
      :history-range-options="dashboard.historyRangeOptions"
      :chart-mode-options="dashboard.chartModeOptions"
      :indicator-options="dashboard.indicatorOptions"
      :top-prediction="dashboard.topPrediction"
      :predictions="dashboard.predictions"
      :latest-rebalance="dashboard.latestRebalance"
      :rebalances="dashboard.backtest.rebalances"
      @update:selected-history-range="dashboard.setSelectedHistoryRange"
      @update:selected-chart-mode="dashboard.setSelectedChartMode"
      @update:selected-indicator="dashboard.setSelectedIndicator"
    />

    <StockTablePanel
      :stocks="dashboard.stocks"
      :selected-symbol="dashboard.selectedSymbol"
      @select="dashboard.loadStockHistory"
    />
  </template>
</template>
