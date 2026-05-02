<script setup>
import PaperTradingWorkspace from "../../components/dashboard/PaperTradingWorkspace.vue";
import { useDashboardContext } from "../../composables/useDashboardContext";

const dashboard = useDashboardContext();
</script>

<template>
  <template v-if="dashboard.loading && !dashboard.paperAccount">
    加载中...
  </template>

  <template v-else>
    <p v-if="dashboard.error" class="subtle-caption">部分接口更新失败：{{ dashboard.error }}</p>

    <PaperTradingWorkspace
      :account="dashboard.paperAccount"
      :positions="dashboard.paperPositions"
      :orders="dashboard.paperOrders"
      :signals="dashboard.paperSignals"
      :execution="dashboard.paperExecution"
      :preview="dashboard.paperPreview"
      :equity-curve="dashboard.paperEquityCurve"
      :rebalance-logs="dashboard.paperRebalanceLogs"
      :risk-events="dashboard.paperRiskEvents"
      :reports="dashboard.paperReports"
      :daily-settings="dashboard.paperDailySettings"
      :daily-runs="dashboard.paperDailyRuns"
      :scheduler-status="dashboard.paperSchedulerStatus"
      :paper-latest-failed-step="dashboard.paperLatestFailedStep"
      :paper-top-n="dashboard.paperTopN"
      :paper-capital-fraction="dashboard.paperCapitalFraction"
      :paper-max-position-weight="dashboard.paperMaxPositionWeight"
      :paper-min-cash-buffer-ratio="dashboard.paperMinCashBufferRatio"
      :paper-max-turnover-ratio="dashboard.paperMaxTurnoverRatio"
      :paper-stop-loss-pct="dashboard.paperStopLossPct"
      :paper-take-profit-pct="dashboard.paperTakeProfitPct"
      :paper-fill-ratio="dashboard.paperFillRatio"
      :paper-max-drawdown-limit="dashboard.paperMaxDrawdownLimit"
      :paper-max-equity-change-limit="dashboard.paperMaxEquityChangeLimit"
      :paper-initial-cash="dashboard.paperInitialCash"
      :paper-loading="dashboard.paperLoading"
      :paper-resetting="dashboard.paperResetting"
      :paper-previewing="dashboard.paperPreviewing"
      :paper-rejecting-preview="dashboard.paperRejectingPreview"
      :paper-retrying-order-id="dashboard.paperRetryingOrderId"
      :paper-cancelling-order-id="dashboard.paperCancellingOrderId"
      :paper-saving-daily-settings="dashboard.paperSavingDailySettings"
      :paper-running-daily-cycle="dashboard.paperRunningDailyCycle"
      :paper-rerunning-daily-step="dashboard.paperRerunningDailyStep"
      :paper-rebalancing="dashboard.paperRebalancing"
      :paper-message="dashboard.paperMessage"
      @update:paper-top-n="dashboard.setPaperTopN"
      @update:paper-capital-fraction="dashboard.setPaperCapitalFraction"
      @update:paper-max-position-weight="dashboard.setPaperMaxPositionWeight"
      @update:paper-min-cash-buffer-ratio="dashboard.setPaperMinCashBufferRatio"
      @update:paper-max-turnover-ratio="dashboard.setPaperMaxTurnoverRatio"
      @update:paper-stop-loss-pct="dashboard.setPaperStopLossPct"
      @update:paper-take-profit-pct="dashboard.setPaperTakeProfitPct"
      @update:paper-fill-ratio="dashboard.setPaperFillRatio"
      @update:paper-max-drawdown-limit="dashboard.setPaperMaxDrawdownLimit"
      @update:paper-max-equity-change-limit="dashboard.setPaperMaxEquityChangeLimit"
      @update:paper-initial-cash="dashboard.setPaperInitialCash"
      @preview="dashboard.handlePreviewPaperRebalance"
      @reject-preview="dashboard.handleRejectPaperPreview"
      @retry-order="dashboard.handleRetryPaperOrder"
      @cancel-order="dashboard.handleCancelPaperOrder"
      @save-daily-settings="dashboard.handleSavePaperDailySettings"
      @run-daily-cycle="dashboard.handleRunPaperDailyCycle"
      @rerun-daily-step="dashboard.handleRerunPaperDailyStep"
      @rerun-latest-failed-step="dashboard.handleRerunLatestFailedStep"
      @update:daily-settings-field="({ key, value }) => dashboard.updatePaperDailySettingsField(key, value)"
      @rebalance="dashboard.handlePaperRebalance"
      @reset="dashboard.handleResetPaperAccount"
    />
  </template>
</template>
