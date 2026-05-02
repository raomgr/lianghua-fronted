export const HISTORY_RANGE_OPTIONS = [
  { key: "1m", label: "1个月", days: 22 },
  { key: "3m", label: "3个月", days: 66 },
  { key: "6m", label: "6个月", days: 132 },
  { key: "all", label: "全部", days: null },
];

export const CHART_MODE_OPTIONS = [
  { key: "line", label: "折线" },
  { key: "candle", label: "K线" },
];

export const INDICATOR_OPTIONS = [
  { key: "none", label: "无指标" },
  { key: "boll", label: "BOLL" },
  { key: "macd", label: "MACD" },
  { key: "rsi", label: "RSI" },
];

export const DEFAULT_BACKTEST_CONTROLS = {
  rebalance_days: 5,
  top_n: 3,
  trading_cost_bps: 8,
  slippage_bps: 5,
};
