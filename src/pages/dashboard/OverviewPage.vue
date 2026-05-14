<script setup>
import BacktestSection from "../../components/dashboard/BacktestSection.vue";
import HeroPanel from "../../components/dashboard/HeroPanel.vue";
import MetricsGrid from "../../components/dashboard/MetricsGrid.vue";
import StatusPanel from "../../components/dashboard/StatusPanel.vue";
import UniverseManager from "../../components/dashboard/UniverseManager.vue";
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
    <div class="overview-page">
      <p v-if="dashboard.error" class="subtle-caption">部分接口更新失败：{{ dashboard.error }}</p>

      <HeroPanel
        :updating="dashboard.updating"
        :training="dashboard.training"
        :last-update-message="dashboard.lastUpdateMessage"
        :last-train-message="dashboard.lastTrainMessage"
        @refresh="dashboard.handleRefresh"
        @train="dashboard.handleTrainModel"
      />

      <StatusPanel :model-status="dashboard.modelStatus" />

      <MetricsGrid :metric-cards="dashboard.metricCards" />

      <BacktestSection
        :backtest="dashboard.backtest"
        :top-pick="dashboard.topPick"
        :stocks="dashboard.stocks"
        :factors="dashboard.factors"
        :sensitivity-scan="dashboard.sensitivityScan"
        :sensitivity-loading="dashboard.sensitivityLoading"
        :stability-report="dashboard.stabilityReport"
        :stability-loading="dashboard.stabilityLoading"
        :monte-carlo-report="dashboard.monteCarloReport"
        :monte-carlo-loading="dashboard.monteCarloLoading"
        :scenario-report="dashboard.scenarioReport"
        :scenario-loading="dashboard.scenarioLoading"
        :backtest-run-history="dashboard.backtestRunHistory"
        :controls="dashboard.backtestControls"
        :backtesting="dashboard.backtesting"
        :preset-name="dashboard.presetName"
        :preset-tag="dashboard.presetTag"
        :preset-tag-options="dashboard.presetTagOptions"
        :removable-preset-tags="dashboard.removablePresetTags"
        :preset-tag-filter="dashboard.presetTagFilter"
        :preset-filter-options="dashboard.presetFilterOptions"
        :preset-filter-pills="dashboard.presetFilterPills"
        :preset-tag-color-map="dashboard.presetTagColorMap"
        :saved-presets="dashboard.savedPresets"
        :filtered-presets="dashboard.filteredPresets"
        :active-preset-id="dashboard.activePresetId"
        :default-preset-id="dashboard.defaultPresetId"
        :preset-sync-message="dashboard.presetSyncMessage"
        @update:controls="dashboard.setBacktestControls"
        @update:preset-name="dashboard.setPresetName"
        @update:preset-tag="dashboard.setPresetTag"
        @update:preset-tag-filter="dashboard.setPresetTagFilter"
        @add-tag="dashboard.addCustomPresetTag"
        @remove-tag="dashboard.removeCustomPresetTag"
        @run="dashboard.handleBacktestRun"
        @run-sensitivity="dashboard.runBacktestSensitivity"
        @apply-sensitivity="dashboard.applySensitivityConfig"
        @run-stability="dashboard.runBacktestStability"
        @run-monte-carlo="dashboard.runBacktestMonteCarlo"
        @run-scenarios="dashboard.runBacktestScenarios"
        @apply-scenario="dashboard.applyScenarioConfig"
        @export-backtest="dashboard.exportBacktestSnapshotCsv"
        @export-history="dashboard.exportBacktestRunHistoryCsv"
        @apply-history="dashboard.applyBacktestHistory"
        @clear-history="dashboard.clearBacktestRunHistory"
        @save-preset="dashboard.saveCurrentPreset"
        @apply-preset="dashboard.applyBacktestPreset"
        @delete-preset="dashboard.deleteBacktestPreset"
        @set-default-preset="dashboard.setDefaultBacktestPreset"
        @rename-preset="dashboard.renameBacktestPreset"
        @retag-preset="dashboard.retagBacktestPreset"
        @duplicate-preset="dashboard.duplicateBacktestPreset"
        @export-presets="dashboard.exportBacktestPresets"
        @import-presets="dashboard.importBacktestPresets"
      />

      <UniverseManager
        :custom-universe-items="dashboard.customUniverseItems"
        :custom-universe-input="dashboard.customUniverseInput"
        :universe-search-query="dashboard.universeSearchQuery"
        :universe-search-results="dashboard.universeSearchResults"
        :custom-universe-symbols="dashboard.customUniverseSymbols"
        :can-save-universe="dashboard.canSaveUniverse"
        :saving-universe="dashboard.savingUniverse"
        :last-universe-message="dashboard.lastUniverseMessage"
        @update:custom-universe-input="dashboard.setCustomUniverseInput"
        @update:universe-search-query="dashboard.setUniverseSearchQuery"
        @search="dashboard.handleUniverseSearch"
        @save="dashboard.handleSaveCustomUniverse"
        @clear="dashboard.handleClearUniverseSelection"
        @add="dashboard.handleAddUniverseItem"
        @remove="dashboard.handleRemoveUniverseItem"
      />
    </div>
  </template>
</template>

<style scoped lang="scss">
.overview-page {
  display: grid;
  gap: 22px;
}

.overview-page :deep(.metrics-board),
.overview-page :deep(.backtest-workspace),
.overview-page :deep(.status-panel),
.overview-page :deep(.universe-panel) {
  margin-top: 0;
}
</style>
