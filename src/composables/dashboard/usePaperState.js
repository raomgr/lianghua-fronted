import { computed, ref } from "vue";
import {
  cancelPaperOrder,
  executePaperRebalance,
  fetchPaperAccount,
  previewPaperRebalance,
  rejectPaperRebalancePreview,
  resetPaperAccount,
  runPaperDailyCycle,
  retryPaperOrder,
  updatePaperDailySettings,
} from "../../services/paper";

export function usePaperState(errorRef) {
  const paperSnapshot = ref(null);
  const paperLoading = ref(false);
  const paperResetting = ref(false);
  const paperRebalancing = ref(false);
  const paperPreviewing = ref(false);
  const paperRejectingPreview = ref(false);
  const paperRetryingOrderId = ref(null);
  const paperCancellingOrderId = ref(null);
  const paperSavingDailySettings = ref(false);
  const paperRunningDailyCycle = ref(false);
  const paperRerunningDailyStep = ref("");
  const paperTopN = ref(3);
  const paperCapitalFraction = ref(0.95);
  const paperMaxPositionWeight = ref(0.35);
  const paperMinCashBufferRatio = ref(0.05);
  const paperMaxTurnoverRatio = ref(1.0);
  const paperStopLossPct = ref(0.1);
  const paperTakeProfitPct = ref(0.2);
  const paperFillRatio = ref(1.0);
  const paperMaxDrawdownLimit = ref(0.18);
  const paperMaxEquityChangeLimit = ref(0.04);
  const paperInitialCash = ref(1_000_000);
  const paperMessage = ref("");

  const paperAccount = computed(() => paperSnapshot.value?.account ?? null);
  const paperPositions = computed(() => paperSnapshot.value?.positions ?? []);
  const paperOrders = computed(() => paperSnapshot.value?.orders ?? []);
  const paperEquityCurve = computed(() => paperSnapshot.value?.equity_curve ?? []);
  const paperRebalanceLogs = computed(() => paperSnapshot.value?.rebalances ?? []);
  const paperRiskEvents = computed(() => paperSnapshot.value?.risk_events ?? []);
  const paperReports = computed(() => paperSnapshot.value?.reports ?? []);
  const paperDailySettings = computed(() => paperSnapshot.value?.daily_settings ?? null);
  const paperDailyRuns = computed(() => paperSnapshot.value?.daily_runs ?? []);
  const paperSchedulerStatus = computed(() => paperSnapshot.value?.scheduler_status ?? null);
  const paperLatestFailedStep = computed(() => {
    for (const run of paperDailyRuns.value) {
      const failedStep = (run?.steps || []).find((item) => item?.status === "failed");
      if (failedStep?.step) {
        return String(failedStep.step);
      }
    }
    return "";
  });
  const paperSignals = computed(() => paperSnapshot.value?.signals ?? []);
  const paperExecution = computed(() => paperSnapshot.value?.execution ?? null);
  const paperPreview = computed(() => paperSnapshot.value?.preview ?? null);

  function buildPaperPayload() {
    return {
      top_n: Number(paperTopN.value || 3),
      capital_fraction: Number(paperCapitalFraction.value || 0.95),
      max_position_weight: Number(paperMaxPositionWeight.value || 0.35),
      min_cash_buffer_ratio: Number(paperMinCashBufferRatio.value || 0.05),
      max_turnover_ratio: Number(paperMaxTurnoverRatio.value || 1.0),
      stop_loss_pct: Number(paperStopLossPct.value || 0.1),
      take_profit_pct: Number(paperTakeProfitPct.value || 0.2),
      fill_ratio: Number(paperFillRatio.value || 1.0),
      max_drawdown_limit: Number(paperMaxDrawdownLimit.value || 0.18),
      max_equity_change_limit: Number(paperMaxEquityChangeLimit.value || 0.04),
    };
  }

  async function loadPaperAccount() {
    paperLoading.value = true;
    errorRef.value = "";
    try {
      paperSnapshot.value = await fetchPaperAccount();
      paperMessage.value = "";
      return paperSnapshot.value;
    } catch (error) {
      errorRef.value = error.message;
      return null;
    } finally {
      paperLoading.value = false;
    }
  }

  async function handleResetPaperAccount() {
    paperResetting.value = true;
    errorRef.value = "";
    try {
      paperSnapshot.value = await resetPaperAccount({ initial_cash: Number(paperInitialCash.value || 0) });
      paperMessage.value = "模拟账户已重置";
    } catch (error) {
      errorRef.value = error.message;
    } finally {
      paperResetting.value = false;
    }
  }

  async function handlePaperRebalance() {
    paperRebalancing.value = true;
    errorRef.value = "";
    try {
      paperSnapshot.value = await executePaperRebalance({
        ...buildPaperPayload(),
        preview_id: paperPreview.value?.plan_id ?? null,
      });
      const ordersCreated = Number(paperSnapshot.value?.execution?.orders_created || 0);
      paperMessage.value = `模拟调仓完成，本次生成 ${ordersCreated} 笔成交`;
    } catch (error) {
      errorRef.value = error.message;
    } finally {
      paperRebalancing.value = false;
    }
  }

  async function handlePreviewPaperRebalance() {
    paperPreviewing.value = true;
    errorRef.value = "";
    try {
      paperSnapshot.value = await previewPaperRebalance(buildPaperPayload());
      const blocked = Boolean(paperSnapshot.value?.preview?.summary?.blocked);
      paperMessage.value = blocked ? "预览完成，但当前计划触发了风控限制" : "预览完成，可以确认执行";
    } catch (error) {
      errorRef.value = error.message;
    } finally {
      paperPreviewing.value = false;
    }
  }

  async function handleRejectPaperPreview() {
    const previewId = paperPreview.value?.plan_id;
    if (!previewId) {
      paperMessage.value = "当前没有待放弃的预览计划";
      return;
    }
    paperRejectingPreview.value = true;
    errorRef.value = "";
    try {
      paperSnapshot.value = await rejectPaperRebalancePreview({ preview_id: Number(previewId) });
      paperMessage.value = "已放弃本次调仓预览计划";
    } catch (error) {
      errorRef.value = error.message;
    } finally {
      paperRejectingPreview.value = false;
    }
  }

  async function handleRetryPaperOrder(orderId) {
    paperRetryingOrderId.value = Number(orderId);
    errorRef.value = "";
    try {
      paperSnapshot.value = await retryPaperOrder({
        order_id: Number(orderId),
        fill_ratio: Number(paperFillRatio.value || 1.0),
      });
      paperMessage.value = `已重试订单 #${orderId}`;
    } catch (error) {
      errorRef.value = error.message;
    } finally {
      paperRetryingOrderId.value = null;
    }
  }

  async function handleCancelPaperOrder(orderId) {
    paperCancellingOrderId.value = Number(orderId);
    errorRef.value = "";
    try {
      paperSnapshot.value = await cancelPaperOrder({ order_id: Number(orderId) });
      paperMessage.value = `已关闭订单 #${orderId} 的剩余数量`;
    } catch (error) {
      errorRef.value = error.message;
    } finally {
      paperCancellingOrderId.value = null;
    }
  }

  async function handleSavePaperDailySettings() {
    paperSavingDailySettings.value = true;
    errorRef.value = "";
    try {
      paperSnapshot.value = await updatePaperDailySettings({
        enabled: paperDailySettings.value?.enabled ?? true,
        run_time: paperDailySettings.value?.run_time || "15:10",
        auto_sync: paperDailySettings.value?.auto_sync ?? true,
        auto_train: paperDailySettings.value?.auto_train ?? true,
        auto_rebalance: paperDailySettings.value?.auto_rebalance ?? true,
        ...buildPaperPayload(),
      });
      paperMessage.value = "每日运行配置已保存";
    } catch (error) {
      errorRef.value = error.message;
    } finally {
      paperSavingDailySettings.value = false;
    }
  }

  async function handleRunPaperDailyCycle() {
    paperRunningDailyCycle.value = true;
    errorRef.value = "";
    try {
      paperSnapshot.value = await runPaperDailyCycle();
      paperMessage.value = "日更流程执行完成";
    } catch (error) {
      errorRef.value = error.message;
    } finally {
      paperRunningDailyCycle.value = false;
    }
  }

  async function handleRerunPaperDailyStep(step) {
    const nextStep = String(step || "sync");
    paperRerunningDailyStep.value = nextStep;
    errorRef.value = "";
    try {
      paperSnapshot.value = await runPaperDailyCycle({ start_from_step: nextStep });
      paperMessage.value = `已从 ${nextStep} 开始补跑日更流程`;
    } catch (error) {
      errorRef.value = error.message;
    } finally {
      paperRerunningDailyStep.value = "";
    }
  }

  async function handleRerunLatestFailedStep() {
    if (!paperLatestFailedStep.value) {
      paperMessage.value = "当前没有可补跑的失败步骤";
      return;
    }
    await handleRerunPaperDailyStep(paperLatestFailedStep.value);
  }

  function updatePaperDailySettingsField(key, value) {
    const current = paperSnapshot.value?.daily_settings ?? {};
    paperSnapshot.value = {
      ...(paperSnapshot.value ?? {}),
      daily_settings: {
        ...current,
        [key]: value,
      },
    };
  }

  function setPaperTopN(value) {
    paperTopN.value = Number(value || 3);
  }

  function setPaperCapitalFraction(value) {
    paperCapitalFraction.value = Number(value || 0.95);
  }

  function setPaperMaxPositionWeight(value) {
    paperMaxPositionWeight.value = Number(value || 0.35);
  }

  function setPaperMinCashBufferRatio(value) {
    paperMinCashBufferRatio.value = Number(value || 0.05);
  }

  function setPaperMaxTurnoverRatio(value) {
    paperMaxTurnoverRatio.value = Number(value || 1.0);
  }

  function setPaperInitialCash(value) {
    paperInitialCash.value = Number(value || 1_000_000);
  }

  function setPaperStopLossPct(value) {
    paperStopLossPct.value = Number(value || 0.1);
  }

  function setPaperTakeProfitPct(value) {
    paperTakeProfitPct.value = Number(value || 0.2);
  }

  function setPaperFillRatio(value) {
    paperFillRatio.value = Number(value || 1.0);
  }

  function setPaperMaxDrawdownLimit(value) {
    paperMaxDrawdownLimit.value = Number(value || 0.18);
  }

  function setPaperMaxEquityChangeLimit(value) {
    paperMaxEquityChangeLimit.value = Number(value || 0.04);
  }

  return {
    paperSnapshot,
    paperLoading,
    paperResetting,
    paperRebalancing,
    paperPreviewing,
    paperRejectingPreview,
    paperRetryingOrderId,
    paperCancellingOrderId,
    paperSavingDailySettings,
    paperRunningDailyCycle,
    paperRerunningDailyStep,
    paperTopN,
    paperCapitalFraction,
    paperMaxPositionWeight,
    paperMinCashBufferRatio,
    paperMaxTurnoverRatio,
    paperStopLossPct,
    paperTakeProfitPct,
    paperFillRatio,
    paperMaxDrawdownLimit,
    paperMaxEquityChangeLimit,
    paperInitialCash,
    paperMessage,
    paperAccount,
    paperPositions,
    paperOrders,
    paperEquityCurve,
    paperRebalanceLogs,
    paperRiskEvents,
    paperReports,
    paperDailySettings,
    paperDailyRuns,
    paperSchedulerStatus,
    paperLatestFailedStep,
    paperSignals,
    paperExecution,
    paperPreview,
    loadPaperAccount,
    handleResetPaperAccount,
    handlePaperRebalance,
    handlePreviewPaperRebalance,
    handleRejectPaperPreview,
    handleRetryPaperOrder,
    handleCancelPaperOrder,
    handleSavePaperDailySettings,
    handleRunPaperDailyCycle,
    handleRerunPaperDailyStep,
    handleRerunLatestFailedStep,
    updatePaperDailySettingsField,
    setPaperTopN,
    setPaperCapitalFraction,
    setPaperMaxPositionWeight,
    setPaperMinCashBufferRatio,
    setPaperMaxTurnoverRatio,
    setPaperInitialCash,
    setPaperStopLossPct,
    setPaperTakeProfitPct,
    setPaperFillRatio,
    setPaperMaxDrawdownLimit,
    setPaperMaxEquityChangeLimit,
  };
}
