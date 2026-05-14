import { computed, onMounted, ref } from "vue";
import { fetchBacktest, fetchFactors, fetchStockHistory, fetchStocks, triggerUpdate } from "../services/market";
import { fetchModelCompare, fetchModelDetail, fetchModelRuns, fetchModelStatus, fetchPredictions } from "../services/model";
import { fetchCustomUniverse } from "../services/universe";
import { useBacktestState } from "./dashboard/useBacktestState";
import { useModelState } from "./dashboard/useModelState";
import { usePaperState } from "./dashboard/usePaperState";
import { useResearchState } from "./dashboard/useResearchState";
import { useSignalState } from "./dashboard/useSignalState";
import { useUniverseState } from "./dashboard/useUniverseState";

function getErrorMessage(error, fallback = "请求异常") {
  if (!error) {
    return fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === "string") {
    return error || fallback;
  }
  return fallback;
}

function summarizeWarnings(warnings) {
  if (!warnings.length) {
    return "";
  }
  if (warnings.length <= 2) {
    return warnings.join("；");
  }
  return `${warnings.slice(0, 2).join("；")}；另有${warnings.length - 2}项请求未完成`;
}

export function useDashboard() {
  const stocks = ref([]);
  const factors = ref([]);
  const error = ref("");
  const loading = ref(true);

  const backtestState = useBacktestState(error);
  const modelState = useModelState(error, () => loadDashboard());
  const paperState = usePaperState(error);
  const signalState = useSignalState(error);
  const researchState = useResearchState(error, stocks, factors, modelState.predictions, backtestState.backtest);
  const universeState = useUniverseState(error, async () => {
    const updateResult = await triggerUpdate();
    modelState.lastUpdateMessage.value = updateResult.message;
    await loadDashboard();
  });

  const summaryChips = computed(() => [
    {
      label: "当前数据源",
      value: modelState.modelStatus.value?.active_data_provider ?? modelState.modelStatus.value?.provider ?? "-",
    },
    { label: "股票池规模", value: `${modelState.modelStatus.value?.universe_size ?? 0} 只` },
    { label: "主模型", value: modelState.championModel.value?.model_name ?? modelState.modelStatus.value?.latest_model_name ?? "-" },
    {
      label: "顶部信号",
      value: modelState.topPrediction.value
        ? `${modelState.topPrediction.value.symbol} ${(modelState.topPrediction.value.predicted_return_5d * 100).toFixed(2)}%`
        : "-",
    },
  ]);

  async function loadDashboard() {
    loading.value = true;
    error.value = "";
    const warnings = [];

    try {
      const [
        stockResult,
        factorResult,
        backtestResult,
        statusResult,
        customUniverseResult,
        predictionResult,
        modelDetailResult,
        modelCompareResult,
        modelRunResult,
        paperAccountResult,
        signalStateResult,
      ] = await Promise.allSettled([
        fetchStocks(),
        fetchFactors(),
        fetchBacktest(backtestState.backtestControls.value),
        fetchModelStatus(),
        fetchCustomUniverse(),
        fetchPredictions(),
        fetchModelDetail(),
        fetchModelCompare(),
        fetchModelRuns(),
        paperState.loadPaperAccount(),
        signalState.loadSignalWorkspace({ silent: true }),
      ]);

      if (stockResult.status === "fulfilled") {
        stocks.value = stockResult.value;
      } else {
        warnings.push(`股票列表失败：${getErrorMessage(stockResult.reason)}`);
      }

      if (factorResult.status === "fulfilled") {
        factors.value = factorResult.value;
      } else {
        warnings.push(`因子结果失败：${getErrorMessage(factorResult.reason)}`);
      }

      if (backtestResult.status === "fulfilled") {
        backtestState.backtest.value = backtestResult.value;
      } else {
        warnings.push(`回测接口失败：${getErrorMessage(backtestResult.reason)}`);
      }

      if (statusResult.status === "fulfilled") {
        modelState.modelStatus.value = statusResult.value;
      } else {
        warnings.push(`模型状态失败：${getErrorMessage(statusResult.reason)}`);
      }

      if (customUniverseResult.status === "fulfilled") {
        universeState.customUniverseItems.value = customUniverseResult.value;
        universeState.customUniverseInput.value = customUniverseResult.value.map((item) => item.symbol).join("\n");
      } else {
        warnings.push(`股票池接口失败：${getErrorMessage(customUniverseResult.reason)}`);
      }

      if (predictionResult.status === "fulfilled") {
        modelState.predictions.value = predictionResult.value;
      } else {
        warnings.push(`预测信号失败：${getErrorMessage(predictionResult.reason)}`);
      }

      if (modelDetailResult.status === "fulfilled") {
        modelState.modelDetail.value = modelDetailResult.value;
      } else {
        warnings.push(`模型详情失败：${getErrorMessage(modelDetailResult.reason)}`);
      }

      if (modelCompareResult.status === "fulfilled") {
        modelState.modelCompare.value = modelCompareResult.value;
      } else {
        warnings.push(`模型对比失败：${getErrorMessage(modelCompareResult.reason)}`);
      }

      if (modelRunResult.status === "fulfilled") {
        modelState.modelRuns.value = modelRunResult.value;
      } else {
        warnings.push(`训练历史失败：${getErrorMessage(modelRunResult.reason)}`);
      }

      if (paperAccountResult.status === "fulfilled") {
        paperState.paperSnapshot.value = paperAccountResult.value;
      } else {
        warnings.push(`模拟账户失败：${getErrorMessage(paperAccountResult.reason)}`);
      }

      if (signalStateResult.status === "fulfilled") {
        // loadSignalWorkspace already hydrates signalCenter and signalHistory.
      } else {
        warnings.push(`实盘信号失败：${getErrorMessage(signalStateResult.reason)}`);
      }

      const nextSymbol = researchState.selectedSymbol.value || stocks.value[0]?.symbol || "";
      if (nextSymbol) {
        researchState.selectedSymbol.value = nextSymbol;
        try {
          const history = await fetchStockHistory(nextSymbol, { limit: 240 });
          researchState.selectedHistory.value = history;
        } catch (historyError) {
          researchState.selectedHistory.value = [];
          warnings.push(`个股历史失败：${getErrorMessage(historyError)}`);
        }
      }

      error.value = summarizeWarnings(warnings);
    } catch (err) {
      error.value = getErrorMessage(err, "加载失败");
    } finally {
      loading.value = false;
    }
  }

  async function handleRefresh() {
    modelState.updating.value = true;
    modelState.lastUpdateMessage.value = "";

    try {
      const result = await triggerUpdate();
      modelState.lastUpdateMessage.value = result.message;
      await loadDashboard();
    } catch (err) {
      error.value = err.message;
    } finally {
      modelState.updating.value = false;
    }
  }

  onMounted(loadDashboard);

  return {
    stocks,
    factors,
    error,
    loading,
    summaryChips,
    loadDashboard,
    handleRefresh,
    ...backtestState,
    ...modelState,
    ...paperState,
    ...signalState,
    ...researchState,
    ...universeState,
  };
}
