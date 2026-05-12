import { computed, ref } from "vue";
import { fetchStockHistory } from "../../services/market";
import { CHART_MODE_OPTIONS, HISTORY_RANGE_OPTIONS, INDICATOR_OPTIONS } from "./constants";

function formatMarketCap(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "-";
  }
  const amount = Number(value);
  if (amount >= 1e8) {
    return `${(amount / 1e8).toFixed(2)}亿`;
  }
  if (amount >= 1e4) {
    return `${(amount / 1e4).toFixed(2)}万`;
  }
  return amount.toFixed(0);
}

export function useResearchState(errorRef, stocks, factors, predictions, backtest) {
  const selectedSymbol = ref("");
  const selectedHistory = ref([]);
  const selectedHistoryRange = ref("3m");
  const selectedChartMode = ref("line");
  const selectedIndicator = ref("none");

  const selectedStock = computed(() => stocks.value.find((stock) => stock.symbol === selectedSymbol.value) ?? null);
  const selectedFactor = computed(() => factors.value.find((item) => item.symbol === selectedSymbol.value) ?? null);
  const topPick = computed(() => factors.value[0] ?? null);

  const visibleHistory = computed(() => {
    if (!selectedHistory.value.length) {
      return [];
    }
    const option = HISTORY_RANGE_OPTIONS.find((item) => item.key === selectedHistoryRange.value);
    if (!option || option.days === null) {
      return selectedHistory.value;
    }
    return selectedHistory.value.slice(-option.days);
  });

  const selectedFactorCards = computed(() => {
    if (!selectedFactor.value && !selectedStock.value) {
      return [];
    }
    const factor = selectedFactor.value ?? {};
    const stock = selectedStock.value ?? {};
    return [
      { label: "Alpha Score", value: (factor.score ?? 0).toFixed(3) },
      { label: "5日收益", value: `${((factor.return_5d ?? 0) * 100).toFixed(2)}%` },
      { label: "20日动量", value: `${((factor.momentum_20 ?? 0) * 100).toFixed(2)}%` },
      { label: "20日波动", value: `${((factor.volatility_20 ?? 0) * 100).toFixed(2)}%` },
      { label: "总市值", value: formatMarketCap(stock.total_mv) },
      { label: "PE(TTM)", value: stock.pe_ttm != null ? Number(stock.pe_ttm).toFixed(2) : "-" },
      { label: "PB", value: stock.pb != null ? Number(stock.pb).toFixed(2) : "-" },
      { label: "流通市值", value: formatMarketCap(stock.circ_mv) },
    ];
  });

  const selectedHistoryStats = computed(() => {
    if (!visibleHistory.value.length) {
      return null;
    }

    const latest = visibleHistory.value.at(-1);
    const lows = visibleHistory.value.map((item) => item.low);
    const highs = visibleHistory.value.map((item) => item.high);

    return {
      latestClose: latest.close,
      periodHigh: Math.max(...highs),
      periodLow: Math.min(...lows),
      periodReturn: ((latest.close / visibleHistory.value[0].close) - 1) * 100,
    };
  });

  const latestRebalance = computed(() => backtest.value?.rebalances?.at(-1) ?? null);

  async function loadStockHistory(symbol) {
    if (!symbol) {
      selectedHistory.value = [];
      return;
    }

    try {
      const history = await fetchStockHistory(symbol, { limit: 240 });
      selectedSymbol.value = symbol;
      selectedHistory.value = history;
    } catch (err) {
      errorRef.value = err.message;
    }
  }

  function setSelectedHistoryRange(value) {
    selectedHistoryRange.value = value;
  }

  function setSelectedChartMode(value) {
    selectedChartMode.value = value;
  }

  function setSelectedIndicator(value) {
    selectedIndicator.value = value;
  }

  return {
    selectedSymbol,
    selectedHistory,
    selectedHistoryRange,
    selectedChartMode,
    selectedIndicator,
    selectedStock,
    selectedFactor,
    topPick,
    visibleHistory,
    selectedFactorCards,
    selectedHistoryStats,
    latestRebalance,
    historyRangeOptions: HISTORY_RANGE_OPTIONS,
    chartModeOptions: CHART_MODE_OPTIONS,
    indicatorOptions: INDICATOR_OPTIONS,
    loadStockHistory,
    setSelectedHistoryRange,
    setSelectedChartMode,
    setSelectedIndicator,
  };
}
