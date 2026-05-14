import { computed, ref } from "vue";
import { fetchStockHistory } from "../../services/market";
import { CHART_MODE_OPTIONS, HISTORY_RANGE_OPTIONS, INDICATOR_OPTIONS } from "./constants";

const PRICE_BASIS_OPTIONS = [
  { key: "qfq", label: "前复权" },
  { key: "raw", label: "原始价" },
];

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

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${Number(value).toFixed(2)}%`;
}

function formatCapitalFlow(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "-";
  }
  const amount = Number(value);
  const sign = amount > 0 ? "+" : "";
  if (Math.abs(amount) >= 1e8) {
    return `${sign}${(amount / 1e8).toFixed(2)}亿`;
  }
  if (Math.abs(amount) >= 1e4) {
    return `${sign}${(amount / 1e4).toFixed(2)}万`;
  }
  return `${sign}${amount.toFixed(0)}`;
}

export function useResearchState(errorRef, stocks, factors, predictions, backtest) {
  const selectedSymbol = ref("");
  const selectedHistory = ref([]);
  const selectedHistoryRange = ref("3m");
  const selectedChartMode = ref("line");
  const selectedIndicator = ref("none");
  const selectedPriceBasis = ref("qfq");

  const selectedStock = computed(() => stocks.value.find((stock) => stock.symbol === selectedSymbol.value) ?? null);
  const selectedFactor = computed(() => factors.value.find((item) => item.symbol === selectedSymbol.value) ?? null);
  const topPick = computed(() => factors.value[0] ?? null);

  const visibleHistory = computed(() => {
    if (!selectedHistory.value.length) {
      return [];
    }
    const option = HISTORY_RANGE_OPTIONS.find((item) => item.key === selectedHistoryRange.value);
    const baseHistory = !option || option.days === null
      ? selectedHistory.value
      : selectedHistory.value.slice(-option.days);
    if (selectedPriceBasis.value !== "qfq") {
      return baseHistory;
    }
    return baseHistory.map((item) => ({
      ...item,
      open: item.qfq_open ?? item.open,
      high: item.qfq_high ?? item.high,
      low: item.qfq_low ?? item.low,
      close: item.qfq_close ?? item.close,
    }));
  });

  const selectedFactorCards = computed(() => {
    if (!selectedFactor.value && !selectedStock.value) {
      return [];
    }
    const factor = selectedFactor.value ?? {};
    const stock = selectedStock.value ?? {};
    const latestBar = selectedHistory.value.at(-1) ?? {};
    const largeOrderNet = (latestBar.buy_lg_amount ?? 0) - (latestBar.sell_lg_amount ?? 0);
    const extraLargeOrderNet = (latestBar.buy_elg_amount ?? 0) - (latestBar.sell_elg_amount ?? 0);

    return [
      { label: "Alpha Score", value: (factor.score ?? 0).toFixed(3) },
      { label: "5日收益", value: `${((factor.return_5d ?? 0) * 100).toFixed(2)}%` },
      { label: "20日动量", value: `${((factor.momentum_20 ?? 0) * 100).toFixed(2)}%` },
      { label: "20日波动", value: `${((factor.volatility_20 ?? 0) * 100).toFixed(2)}%` },
      { label: "自由流通换手", value: formatPercent(stock.turnover_rate_f ?? latestBar.turnover_rate_f) },
      { label: "主力净流入", value: formatCapitalFlow(latestBar.net_mf_amount) },
      { label: "大单净额", value: formatCapitalFlow(largeOrderNet) },
      { label: "超大单净额", value: formatCapitalFlow(extraLargeOrderNet) },
      { label: "总市值", value: formatMarketCap(stock.total_mv) },
      { label: "流通市值", value: formatMarketCap(stock.circ_mv) },
      { label: "PE(TTM)", value: stock.pe_ttm != null ? Number(stock.pe_ttm).toFixed(2) : "-" },
      { label: "PB", value: stock.pb != null ? Number(stock.pb).toFixed(2) : "-" },
      { label: "ROE(摊薄)", value: formatPercent(stock.roe_dt) },
      { label: "毛利率", value: formatPercent(stock.grossprofit_margin) },
      { label: "资产负债率", value: formatPercent(stock.debt_to_assets) },
      { label: "每股经营现金流", value: stock.ocfps != null && !Number.isNaN(Number(stock.ocfps)) ? Number(stock.ocfps).toFixed(2) : "-" },
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
      selectedSymbol.value = "";
      selectedHistory.value = [];
      return;
    }

    selectedSymbol.value = symbol;

    try {
      const history = await fetchStockHistory(symbol, { limit: 240 });
      selectedHistory.value = history;
    } catch (err) {
      selectedHistory.value = [];
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

  function setSelectedPriceBasis(value) {
    selectedPriceBasis.value = value;
  }

  return {
    selectedSymbol,
    selectedHistory,
    selectedHistoryRange,
    selectedChartMode,
    selectedIndicator,
    selectedPriceBasis,
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
    priceBasisOptions: PRICE_BASIS_OPTIONS,
    loadStockHistory,
    setSelectedHistoryRange,
    setSelectedChartMode,
    setSelectedIndicator,
    setSelectedPriceBasis,
  };
}
