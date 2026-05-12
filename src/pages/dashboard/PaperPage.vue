<script setup>
import { computed } from "vue";
import PaperTradingWorkspace from "../../components/dashboard/PaperTradingWorkspace.vue";
import { useDashboardContext } from "../../composables/useDashboardContext";

const dashboard = useDashboardContext();

const paperProps = computed(() => ({
  account: dashboard.paperAccount,
  positions: dashboard.paperPositions,
  orders: dashboard.paperOrders,
  signals: dashboard.paperSignals,
  execution: dashboard.paperExecution,
  preview: dashboard.paperPreview,
  equityCurve: dashboard.paperEquityCurve,
  rebalanceLogs: dashboard.paperRebalanceLogs,
  riskEvents: dashboard.paperRiskEvents,
  reports: dashboard.paperReports,
  dailySettings: dashboard.paperDailySettings,
  dailyRuns: dashboard.paperDailyRuns,
  schedulerStatus: dashboard.paperSchedulerStatus,
  paperLatestFailedStep: dashboard.paperLatestFailedStep,
  paperTopN: dashboard.paperTopN,
  paperCapitalFraction: dashboard.paperCapitalFraction,
  paperMaxPositionWeight: dashboard.paperMaxPositionWeight,
  paperMinCashBufferRatio: dashboard.paperMinCashBufferRatio,
  paperMaxTurnoverRatio: dashboard.paperMaxTurnoverRatio,
  paperStopLossPct: dashboard.paperStopLossPct,
  paperTakeProfitPct: dashboard.paperTakeProfitPct,
  paperFillRatio: dashboard.paperFillRatio,
  paperMaxDrawdownLimit: dashboard.paperMaxDrawdownLimit,
  paperMaxEquityChangeLimit: dashboard.paperMaxEquityChangeLimit,
  paperMinSignalReturnPct: dashboard.paperMinSignalReturnPct,
  paperMinLiquidityAmount: dashboard.paperMinLiquidityAmount,
  paperMinTurnoverRate: dashboard.paperMinTurnoverRate,
  paperInitialCash: dashboard.paperInitialCash,
  paperLoading: dashboard.paperLoading,
  paperResetting: dashboard.paperResetting,
  paperPreviewing: dashboard.paperPreviewing,
  paperRejectingPreview: dashboard.paperRejectingPreview,
  paperRetryingOrderId: dashboard.paperRetryingOrderId,
  paperCancellingOrderId: dashboard.paperCancellingOrderId,
  paperSavingDailySettings: dashboard.paperSavingDailySettings,
  paperRunningDailyCycle: dashboard.paperRunningDailyCycle,
  paperRerunningDailyStep: dashboard.paperRerunningDailyStep,
  paperRebalancing: dashboard.paperRebalancing,
  paperMessage: dashboard.paperMessage,
}));
</script>

<template>
  <template v-if="dashboard.loading && !dashboard.paperAccount">
    加载中...
  </template>

  <template v-else>
    <p v-if="dashboard.error" class="subtle-caption">部分接口更新失败：{{ dashboard.error }}</p>

    <PaperTradingWorkspace
      v-bind="paperProps"
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
      @update:paper-min-signal-return-pct="dashboard.setPaperMinSignalReturnPct"
      @update:paper-min-liquidity-amount="dashboard.setPaperMinLiquidityAmount"
      @update:paper-min-turnover-rate="dashboard.setPaperMinTurnoverRate"
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
