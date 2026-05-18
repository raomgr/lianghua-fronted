<script setup>
import { computed, defineAsyncComponent, ref, watch } from "vue";

const EquityCurveChart = defineAsyncComponent(() => import("../charts/EquityCurveChart.vue"));
const BacktestRunScatterChart = defineAsyncComponent(() => import("../charts/BacktestRunScatterChart.vue"));
const BacktestSensitivityHeatmap = defineAsyncComponent(() => import("../charts/BacktestSensitivityHeatmap.vue"));
const BacktestStabilityChart = defineAsyncComponent(() => import("../charts/BacktestStabilityChart.vue"));
const BacktestMonteCarloHistogram = defineAsyncComponent(() => import("../charts/BacktestMonteCarloHistogram.vue"));

const props = defineProps({
  backtest: { type: Object, required: true },
  topPick: { type: Object, default: null },
  stocks: { type: Array, default: () => [] },
  factors: { type: Array, default: () => [] },
  sensitivityScan: { type: Object, default: null },
  sensitivityLoading: { type: Boolean, default: false },
  stabilityReport: { type: Object, default: null },
  stabilityLoading: { type: Boolean, default: false },
  monteCarloReport: { type: Object, default: null },
  monteCarloLoading: { type: Boolean, default: false },
  scenarioReport: { type: Object, default: null },
  scenarioLoading: { type: Boolean, default: false },
  backtestRunHistory: { type: Array, default: () => [] },
  controls: { type: Object, required: true },
  backtesting: { type: Boolean, default: false },
  presetName: { type: String, default: "" },
  presetTag: { type: String, default: "通用" },
  presetTagOptions: { type: Array, default: () => [] },
  removablePresetTags: { type: Array, default: () => [] },
  presetTagFilter: { type: String, default: "全部" },
  presetFilterOptions: { type: Array, default: () => [] },
  presetFilterPills: { type: Array, default: () => [] },
  presetTagColorMap: { type: Object, default: () => ({}) },
  savedPresets: { type: Array, default: () => [] },
  filteredPresets: { type: Array, default: () => [] },
  activePresetId: { type: String, default: "" },
  defaultPresetId: { type: String, default: "" },
});

const emit = defineEmits([
  "update:controls",
  "update:presetName",
  "update:presetTag",
  "update:presetTagFilter",
  "add-tag",
  "remove-tag",
  "run",
  "run-sensitivity",
  "run-stability",
  "run-monte-carlo",
  "run-scenarios",
  "apply-sensitivity",
  "apply-scenario",
  "export-backtest",
  "export-history",
  "apply-history",
  "clear-history",
  "save-preset",
  "apply-preset",
  "delete-preset",
  "set-default-preset",
  "rename-preset",
  "retag-preset",
  "duplicate-preset",
  "export-presets",
  "import-presets",
]);

function updateControl(key, value) {
  emit("update:controls", { ...props.controls, [key]: value });
}

const topPickName = computed(() => props.stocks.find((row) => row.symbol === props.topPick?.symbol)?.name ?? props.topPick?.symbol ?? "-");

const historyWindow = ref("20");
const historyXAxis = ref("annual_return");
const historyYAxis = ref("sharpe");
const historySize = ref("total_return");
const presetPage = ref(1);
const historyListPage = ref(1);

const PRESET_PAGE_SIZE = 4;
const HISTORY_LIST_PAGE_SIZE = 6;

const historyWindowOptions = [
  { value: "10", label: "最近10次", count: 10 },
  { value: "20", label: "最近20次", count: 20 },
  { value: "all", label: "全部", count: Number.POSITIVE_INFINITY },
];

const historyMetricOptions = [
  { value: "annual_return", label: "年化收益" },
  { value: "sharpe", label: "Sharpe" },
  { value: "max_drawdown", label: "最大回撤" },
  { value: "total_return", label: "总收益" },
];

const selectedHistoryId = ref("");
const sensitivityMetric = ref("sharpe");
const sensitivityCost = ref(null);
const selectedSensitivityKey = ref("");
const scanWidth = ref(1);
const stabilityMetric = ref("rolling_sharpe");
const stabilityWindow = ref(20);
const monteCarloTrials = ref(300);
const analysisTab = ref("scan");

const analysisTabs = [
  { value: "scan", label: "参数扫描", hint: "找更稳参数" },
  { value: "stability", label: "稳定性", hint: "看市场阶段表现" },
  { value: "scenario", label: "情景对比", hint: "横向比较方案" },
  { value: "montecarlo", label: "Monte Carlo", hint: "看路径分布" },
];

const activeModeLabel = computed(() => (props.controls.backtest_mode === "model" ? "模型驱动" : "规则打分"));
const activeBenchmarkName = computed(() => props.backtest?.summary?.benchmark_name || "池内等权基准");
const activeModelName = computed(() => props.backtest?.summary?.model_name || props.backtest?.summary?.signal_source || "当前配置");
const activeSignalSourceLabel = computed(() => {
  if (props.backtest?.summary?.signal_source) {
    return formatSignalSource(props.backtest.summary.signal_source);
  }
  return props.controls.backtest_mode === "model" ? "模型打分" : "因子规则";
});

const displayedRunHistory = computed(() => {
  const list = props.backtestRunHistory || [];
  const option = historyWindowOptions.find((item) => item.value === historyWindow.value) ?? historyWindowOptions[1];
  if (!Number.isFinite(option.count)) {
    return list;
  }
  return list.slice(0, option.count);
});
const paginatedRunHistory = computed(() => {
  const start = (historyListPage.value - 1) * HISTORY_LIST_PAGE_SIZE;
  return displayedRunHistory.value.slice(start, start + HISTORY_LIST_PAGE_SIZE);
});
const selectedHistoryItem = computed(() => displayedRunHistory.value.find((item) => item.id === selectedHistoryId.value) ?? null);
const paginatedPresets = computed(() => {
  const start = (presetPage.value - 1) * PRESET_PAGE_SIZE;
  return props.filteredPresets.slice(start, start + PRESET_PAGE_SIZE);
});

const sensitivityMetricOptions = [
  { value: "sharpe", label: "Sharpe" },
  { value: "annual_return", label: "年化收益" },
  { value: "calmar", label: "Calmar" },
  { value: "total_return", label: "总收益" },
  { value: "max_drawdown", label: "最大回撤" },
  { value: "sortino", label: "Sortino" },
  { value: "information_ratio", label: "信息比率" },
];
const sensitivityRows = computed(() => props.sensitivityScan?.rows || []);
const sensitivityCostOptions = computed(() => props.sensitivityScan?.trading_cost_options || []);
const selectedSensitivityPoint = computed(() =>
  sensitivityRows.value.find(
    (row) => `${row.rebalance_days}-${row.top_n}-${row.trading_cost_bps}` === selectedSensitivityKey.value,
  ) ?? null,
);
const topSensitivityRows = computed(() => sensitivityRows.value.slice(0, 8));
const sensitivityBestSharpe = computed(() => props.sensitivityScan?.best_sharpe || null);
const sensitivityBestAnnual = computed(() => props.sensitivityScan?.best_annual_return || null);
const sensitivityBestCalmar = computed(() => props.sensitivityScan?.best_calmar || null);
const stabilitySummary = computed(() => props.stabilityReport?.summary || null);
const stabilityRollingPoints = computed(() => props.stabilityReport?.rolling_points || []);
const stabilityMonthlyPoints = computed(() => props.stabilityReport?.monthly_points || []);
const stabilityRegimeStats = computed(() => props.stabilityReport?.regime_stats || []);
const monteCarloSummary = computed(() => props.monteCarloReport?.summary || null);
const monteCarloAnnualBins = computed(() => props.monteCarloReport?.annual_return_histogram || []);
const monteCarloDrawdownBins = computed(() => props.monteCarloReport?.max_drawdown_histogram || []);
const scenarioRows = computed(() => props.scenarioReport?.rows || []);
const scenarioChampion = computed(() => props.scenarioReport?.champion || null);
const stabilityMetricOptions = [
  { value: "rolling_sharpe", label: "Rolling Sharpe" },
  { value: "rolling_volatility", label: "Rolling Vol" },
  { value: "rolling_excess_return", label: "Rolling Excess" },
  { value: "rolling_max_drawdown", label: "Rolling MaxDD" },
];

watch(displayedRunHistory, (rows) => {
  if (!rows.length) {
    selectedHistoryId.value = "";
    historyListPage.value = 1;
    return;
  }
  const maxPage = Math.max(1, Math.ceil(rows.length / HISTORY_LIST_PAGE_SIZE));
  if (historyListPage.value > maxPage) {
    historyListPage.value = maxPage;
  }
  if (!rows.some((item) => item.id === selectedHistoryId.value)) {
    selectedHistoryId.value = rows[0].id;
  }
}, { immediate: true });

watch(() => props.filteredPresets.length, (count) => {
  const maxPage = Math.max(1, Math.ceil(count / PRESET_PAGE_SIZE));
  if (presetPage.value > maxPage) {
    presetPage.value = maxPage;
  }
}, { immediate: true });

watch(() => props.presetTagFilter, () => {
  presetPage.value = 1;
});

watch(() => props.activePresetId, (presetId) => {
  if (!presetId) {
    return;
  }
  const index = props.filteredPresets.findIndex((item) => item.id === presetId);
  if (index >= 0) {
    presetPage.value = Math.floor(index / PRESET_PAGE_SIZE) + 1;
  }
}, { immediate: true });

watch(sensitivityCostOptions, (options) => {
  if (!options.length) {
    sensitivityCost.value = null;
    return;
  }
  if (!options.includes(sensitivityCost.value)) {
    sensitivityCost.value = options[0];
  }
}, { immediate: true });

const factorBucketRows = computed(() => {
  const rows = (props.factors || [])
    .map((item) => ({
      symbol: item.symbol,
      score: Number(item.score ?? 0),
      return_5d: Number(item.return_5d ?? 0),
    }))
    .filter((item) => Number.isFinite(item.score) && Number.isFinite(item.return_5d))
    .sort((a, b) => b.score - a.score);

  if (rows.length < 5) {
    return [];
  }

  const bucketCount = 5;
  const results = [];
  for (let index = 0; index < bucketCount; index += 1) {
    const start = Math.floor((index * rows.length) / bucketCount);
    const end = Math.floor(((index + 1) * rows.length) / bucketCount);
    const slice = rows.slice(start, end);
    if (!slice.length) {
      continue;
    }

    const avgScore = slice.reduce((acc, cur) => acc + cur.score, 0) / slice.length;
    const avgReturn5d = slice.reduce((acc, cur) => acc + cur.return_5d, 0) / slice.length;
    results.push({
      bucket: `Q${index + 1}`,
      count: slice.length,
      avgScore,
      avgReturn5d,
    });
  }
  return results;
});

const factorLongShortSpread = computed(() => {
  if (factorBucketRows.value.length < 2) {
    return null;
  }

  const top = factorBucketRows.value[0];
  const bottom = factorBucketRows.value.at(-1);
  return top.avgReturn5d - bottom.avgReturn5d;
});

const presetNameModel = computed({
  get: () => props.presetName,
  set: (value) => emit("update:presetName", value),
});

const presetTagModel = computed({
  get: () => props.presetTag,
  set: (value) => emit("update:presetTag", value),
});

function formatPresetTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const text = await file.text();
  emit("import-presets", text);
  event.target.value = "";
}

function handleRenamePreset(preset) {
  if (typeof window === "undefined") {
    return;
  }

  const value = window.prompt("方案名称", preset.name);
  if (value === null) {
    return;
  }

  emit("rename-preset", { presetId: preset.id, name: value });
}

function handleRetagPreset(preset) {
  if (typeof window === "undefined") {
    return;
  }

  const value = window.prompt("方案标签", preset.tag || "通用");
  if (value === null) {
    return;
  }

  emit("retag-preset", { presetId: preset.id, tag: value });
}

function handleAddTag() {
  if (typeof window === "undefined") {
    return;
  }

  const value = window.prompt("新增标签");
  if (value === null) {
    return;
  }

  emit("add-tag", value);
}

function handleRemoveTag() {
  if (typeof window === "undefined" || !props.removablePresetTags.length) {
    return;
  }

  const current = props.removablePresetTags.join(" / ");
  const value = window.prompt(`删除标签（可选：${current}）`);
  if (value === null) {
    return;
  }

  emit("remove-tag", value);
}

function formatPct(value, digits = 2) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

function formatSignalSource(value) {
  if (!value) {
    return "-";
  }
  if (value === "factor-rule") {
    return "因子规则";
  }
  if (value === "model-score") {
    return "模型打分";
  }
  return value;
}

function handleSelectHistory(entryId) {
  selectedHistoryId.value = String(entryId || "");
  const index = displayedRunHistory.value.findIndex((item) => item.id === selectedHistoryId.value);
  if (index >= 0) {
    historyListPage.value = Math.floor(index / HISTORY_LIST_PAGE_SIZE) + 1;
  }
}

function applySelectedHistory() {
  if (!selectedHistoryId.value) {
    return;
  }
  emit("apply-history", selectedHistoryId.value);
}

function triggerSensitivityScan() {
  emit("run-sensitivity", Number(scanWidth.value || 1));
}

function formatSensitivityValue(row) {
  if (!row) {
    return "-";
  }
  const value = Number(row[sensitivityMetric.value] ?? 0);
  if (sensitivityMetric.value === "annual_return" || sensitivityMetric.value === "total_return" || sensitivityMetric.value === "max_drawdown") {
    return `${(value * 100).toFixed(2)}%`;
  }
  return value.toFixed(3);
}

function handleSelectSensitivity(point) {
  if (!point) {
    return;
  }
  selectedSensitivityKey.value = `${point.rebalance_days}-${point.top_n}-${point.trading_cost_bps}`;
}

function applySelectedSensitivity() {
  if (!selectedSensitivityPoint.value) {
    return;
  }
  emit("apply-sensitivity", selectedSensitivityPoint.value);
}

function triggerStabilityRun() {
  emit("run-stability", Number(stabilityWindow.value || 20));
}

function triggerMonteCarloRun() {
  emit("run-monte-carlo", Number(monteCarloTrials.value || 300));
}

function triggerScenarioRun() {
  emit("run-scenarios");
}

function applyScenario(row) {
  if (!row) {
    return;
  }
  emit("apply-scenario", row);
}

function applySensitivityRecommendation(point) {
  if (!point) {
    return;
  }
  emit("apply-sensitivity", point);
}
</script>

<template>
  <section class="section-panel backtest-workspace">
    <section class="panel workspace-module workspace-results-module">
      <div class="workspace-block-head">
        <div class="workspace-block-head-main">
          <div class="section-title">策略结果</div>
          <div class="workspace-meta inline">
            <span class="workspace-pill">{{ activeModeLabel }}</span>
            <span class="workspace-pill muted">{{ activeBenchmarkName }}</span>
          </div>
        </div>
        <el-button plain :disabled="!backtest?.equity_curve?.length" @click="$emit('export-backtest')">导出曲线CSV</el-button>
      </div>

      <el-row :gutter="18" class="results-layout">
        <el-col :xs="24" :lg="16" class="result-col">
          <div class="result-chart-area">
            <div class="chart-frame workspace-chart-frame">
              <EquityCurveChart :equity-curve="backtest.equity_curve" />
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :lg="8" class="result-col">
          <aside class="current-signal-panel">
            <div class="signal-head">
              <div>
                <div class="section-title">当前信号</div>
                <p class="subtle-caption signal-subhead">{{ activeSignalSourceLabel }} · {{ activeModelName }}</p>
              </div>
              <el-tag effect="light" round>{{ activeModeLabel }}</el-tag>
            </div>
            <template v-if="topPick">
              <div class="signal-focus-hero">
                <div class="signal-focus-main">
                  <div class="focus-symbol">{{ topPick.symbol }}</div>
                  <div class="focus-name">{{ topPickName }}</div>
                </div>
                <div class="signal-score-card">
                  <span>Alpha Score</span>
                  <strong>{{ (topPick.score ?? 0).toFixed(3) }}</strong>
                </div>
              </div>
              <div class="signal-metric-section">
                <div class="signal-section-title">关键指标</div>
                <div class="signal-metric-list">
                  <div class="signal-metric">
                    <span>5日收益</span>
                    <strong>{{ formatPct(topPick.return_5d, 2) }}</strong>
                  </div>
                  <div class="signal-metric">
                    <span>20日动量</span>
                    <strong>{{ formatPct(topPick.momentum_20, 2) }}</strong>
                  </div>
                  <div class="signal-metric">
                    <span>20日波动</span>
                    <strong>{{ formatPct(topPick.volatility_20, 2) }}</strong>
                  </div>
                  <div class="signal-metric">
                    <span>5日量比</span>
                    <strong>{{ Number(topPick.volume_ratio_5 || 0).toFixed(2) }}</strong>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="compact-empty compact-empty-inline">暂无焦点股票</div>
          </aside>
        </el-col>
      </el-row>

      <div class="result-summary-strip">
        <div class="result-summary-item primary">
          <span>策略年化</span>
          <strong>{{ formatPct(backtest?.summary?.annual_return, 2) }}</strong>
          <small>收益水平</small>
        </div>
        <div class="result-summary-item">
          <span>Sharpe</span>
          <strong>{{ Number(backtest?.summary?.sharpe || 0).toFixed(2) }}</strong>
          <small>风险调整后收益</small>
        </div>
        <div class="result-summary-item">
          <span>最大回撤</span>
          <strong>{{ formatPct(backtest?.summary?.max_drawdown, 2) }}</strong>
          <small>主要风险</small>
        </div>
        <div class="result-summary-item">
          <span>基准</span>
          <strong>{{ activeBenchmarkName }}</strong>
          <small>对照口径</small>
        </div>
      </div>
    </section>

    <section class="panel workspace-module control-hub-card">
      <div class="workspace-block-head">
        <div class="section-title">回测参数与方案</div>
        <div class="hero-actions compact-actions">
          <el-button type="primary" size="large" :disabled="backtesting" @click="$emit('run')">
            {{ backtesting ? "回测中..." : "重新运行回测" }}
          </el-button>
        </div>
      </div>

      <div class="control-stack">
        <section class="control-section control-card control-overview-card">
          <div class="control-section-head">
            <div class="section-title">参数设置</div>
          </div>
          <el-form label-position="top" class="parameter-form">
            <div class="parameter-grid parameter-grid-compact">
              <el-form-item label="信号来源">
                <el-select size="large" :model-value="controls.backtest_mode" @change="updateControl('backtest_mode', $event)">
                  <el-option label="规则打分" value="rule" />
                  <el-option label="模型驱动" value="model" />
                </el-select>
              </el-form-item>
              <el-form-item label="调仓天数">
                <el-input-number
                  size="large"
                  :model-value="controls.rebalance_days"
                  :min="1"
                  :max="20"
                  controls-position="right"
                  @update:model-value="updateControl('rebalance_days', Number($event || 1))"
                />
              </el-form-item>
              <el-form-item label="持仓数量">
                <el-input-number
                  size="large"
                  :model-value="controls.top_n"
                  :min="1"
                  :max="10"
                  controls-position="right"
                  @update:model-value="updateControl('top_n', Number($event || 1))"
                />
              </el-form-item>
              <el-form-item label="手续费(bps)">
                <el-input-number
                  size="large"
                  :model-value="controls.trading_cost_bps"
                  :min="0"
                  :max="100"
                  controls-position="right"
                  @update:model-value="updateControl('trading_cost_bps', Number($event || 0))"
                />
              </el-form-item>
              <el-form-item label="滑点(bps)">
                <el-input-number
                  size="large"
                  :model-value="controls.slippage_bps"
                  :min="0"
                  :max="100"
                  controls-position="right"
                  @update:model-value="updateControl('slippage_bps', Number($event || 0))"
                />
              </el-form-item>
            </div>
          </el-form>

          <div class="control-summary-strip">
            <div class="control-summary-item">
              <span>回测模式</span>
              <strong>{{ activeModeLabel }}</strong>
            </div>
            <div class="control-summary-item">
              <span>信号来源</span>
              <strong>{{ activeSignalSourceLabel }}</strong>
            </div>
            <div class="control-summary-item">
              <span>基准</span>
              <strong>{{ activeBenchmarkName }}</strong>
            </div>
            <div class="control-summary-item">
              <span>当前方案</span>
              <strong>{{ activePresetId ? "已套用预设" : "临时参数" }}</strong>
            </div>
            <div class="control-summary-item">
              <span>调仓 / 持仓</span>
              <strong>{{ controls.rebalance_days }}天 / {{ controls.top_n }}只</strong>
            </div>
            <div class="control-summary-item">
              <span>成本设置</span>
              <strong>{{ controls.trading_cost_bps }} + {{ controls.slippage_bps }} bps</strong>
            </div>
          </div>
        </section>

        <section class="control-section control-card control-card-wide">
          <div class="control-section-head">
            <div class="section-title">方案管理</div>
            <div class="preset-sync-row compact-row">
              <el-button plain class="preset-sync-button" :disabled="!savedPresets.length" @click="$emit('export-presets')">
                导出 JSON
              </el-button>
              <label class="file-trigger">
                <el-button plain class="preset-sync-button" tag="span">导入 JSON</el-button>
                <input class="file-hidden-input" type="file" accept="application/json,.json" @change="handleImportFile">
              </label>
            </div>
          </div>
          <div class="preset-toolbar preset-toolbar-wide">
            <el-input v-model="presetNameModel" size="large" placeholder="给这组参数起个名字" />
            <el-select v-model="presetTagModel" size="large">
              <el-option v-for="tag in presetTagOptions" :key="tag" :label="tag" :value="tag" />
            </el-select>
            <el-button type="primary" size="large" @click="$emit('save-preset')">保存方案</el-button>
          </div>
          <div class="preset-filter-row">
            <button
              v-for="pill in presetFilterPills"
              :key="`filter-${pill.tag}`"
              class="preset-filter-chip"
              :class="{ active: pill.tag === presetTagFilter }"
              @click="$emit('update:presetTagFilter', pill.tag)"
            >
              <span>{{ pill.tag }}</span>
              <strong class="preset-filter-count">{{ pill.count }}</strong>
            </button>
            <button class="preset-filter-chip utility" @click="handleAddTag">+标签</button>
            <button class="preset-filter-chip utility" :disabled="!removablePresetTags.length" @click="handleRemoveTag">-标签</button>
          </div>
          <div class="preset-strip">
            <article
              v-for="preset in paginatedPresets"
              :key="preset.id"
              class="preset-chip"
              :class="{ active: preset.id === activePresetId, pinned: preset.id === defaultPresetId }"
              role="button"
              tabindex="0"
              @click="$emit('apply-preset', preset.id)"
              @keydown.enter.prevent="$emit('apply-preset', preset.id)"
              @keydown.space.prevent="$emit('apply-preset', preset.id)"
            >
              <div class="preset-chip-head">
                <span class="preset-chip-title">{{ preset.name }}</span>
                <div class="preset-chip-badges">
                  <small class="preset-tag-badge">{{ preset.tag || "未分类" }}</small>
                </div>
              </div>
              <small class="preset-chip-summary">
                {{ preset.controls.backtest_mode === "model" ? "模型" : "规则" }} / {{ preset.controls.rebalance_days }}天 / {{ preset.controls.top_n }}股 / {{ preset.controls.trading_cost_bps }}-{{ preset.controls.slippage_bps }}
              </small>
              <small v-if="preset.last_used_at" class="preset-meta">最近使用 {{ formatPresetTime(preset.last_used_at) }}</small>
              <div class="preset-chip-actions">
                <el-button
                  link
                  size="small"
                  class="preset-action"
                  :type="preset.id === defaultPresetId ? 'success' : 'default'"
                  @click.stop="$emit('set-default-preset', preset.id)"
                >
                  {{ preset.id === defaultPresetId ? "默认" : "设默认" }}
                </el-button>
                <el-button link size="small" class="preset-action" @click.stop="handleRetagPreset(preset)">标签</el-button>
                <el-button link size="small" class="preset-action" @click.stop="$emit('duplicate-preset', preset.id)">复制</el-button>
                <el-button link size="small" class="preset-action" @click.stop="handleRenamePreset(preset)">改名</el-button>
                <el-button link size="small" type="danger" class="preset-action danger" @click.stop="$emit('delete-preset', preset.id)">删除</el-button>
              </div>
            </article>
            <div v-if="!savedPresets.length" class="subtle-caption preset-empty">暂无方案。</div>
            <div v-else-if="!filteredPresets.length" class="subtle-caption preset-empty">当前标签下暂无方案。</div>
          </div>
          <div v-if="filteredPresets.length > PRESET_PAGE_SIZE" class="list-pagination">
            <el-pagination
              v-model:current-page="presetPage"
              :page-size="PRESET_PAGE_SIZE"
              layout="prev, pager, next, total"
              background
              :total="filteredPresets.length"
            />
          </div>
        </section>

        <section class="control-section control-card control-card-wide">
          <div class="control-section-head">
            <div class="section-title">运行历史</div>
            <div class="history-actions">
              <el-button plain :disabled="!backtestRunHistory.length" @click="$emit('export-history')">导出历史CSV</el-button>
              <el-button plain :disabled="!selectedHistoryItem" @click="applySelectedHistory">套用已选</el-button>
              <el-button type="danger" plain :disabled="!backtestRunHistory.length" @click="$emit('clear-history')">清空</el-button>
            </div>
          </div>
          <div class="history-tools">
            <div class="history-tools-label">
              <span>范围</span>
              <el-select v-model="historyWindow" class="history-select-control">
                <el-option v-for="item in historyWindowOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </div>
            <div class="history-tools-label">
              <span>X轴</span>
              <el-select v-model="historyXAxis" class="history-select-control">
                <el-option v-for="item in historyMetricOptions" :key="`x-${item.value}`" :label="item.label" :value="item.value" />
              </el-select>
            </div>
            <div class="history-tools-label">
              <span>Y轴</span>
              <el-select v-model="historyYAxis" class="history-select-control">
                <el-option v-for="item in historyMetricOptions" :key="`y-${item.value}`" :label="item.label" :value="item.value" />
              </el-select>
            </div>
            <div class="history-tools-label">
              <span>点大小</span>
              <el-select v-model="historySize" class="history-select-control">
                <el-option v-for="item in historyMetricOptions" :key="`size-${item.value}`" :label="item.label" :value="item.value" />
              </el-select>
            </div>
          </div>
          <div v-if="displayedRunHistory.length" class="chart-frame history-chart-frame">
            <BacktestRunScatterChart
              :runs="displayedRunHistory"
              :x-metric="historyXAxis"
              :y-metric="historyYAxis"
              :size-metric="historySize"
              :selected-id="selectedHistoryId"
              @select="handleSelectHistory"
            />
          </div>
          <template v-if="displayedRunHistory.length">
            <div class="history-list card-scroll">
              <div
                v-for="item in paginatedRunHistory"
                :key="item.id"
                class="history-row model-run-row clickable-row run-history-row"
                :class="{ selected: item.id === selectedHistoryId }"
                @click="handleSelectHistory(item.id)"
              >
                <div class="run-history-main">
                  <strong class="run-history-time">{{ formatPresetTime(item.run_at) }}</strong>
                  <p class="run-history-summary subtle-caption">
                    {{ item.controls.rebalance_days }}天 / {{ item.controls.top_n }}股 / {{ item.controls.trading_cost_bps }}-{{ item.controls.slippage_bps }}
                  </p>
                </div>
                <div class="run-history-metrics">
                  <strong class="run-history-kpi">年化 {{ formatPct(item.summary.annual_return, 2) }}</strong>
                  <p class="run-history-meta subtle-caption">Sharpe {{ Number(item.summary.sharpe || 0).toFixed(2) }} · 回撤 {{ formatPct(item.summary.max_drawdown, 2) }}</p>
                </div>
                <div class="run-history-action">
                  <el-button plain @click.stop="$emit('apply-history', item.id)">套用</el-button>
                </div>
              </div>
            </div>
            <div v-if="displayedRunHistory.length > HISTORY_LIST_PAGE_SIZE" class="list-pagination">
              <el-pagination
                v-model:current-page="historyListPage"
                :page-size="HISTORY_LIST_PAGE_SIZE"
                layout="prev, pager, next, total"
                background
                :total="displayedRunHistory.length"
              />
            </div>
          </template>
          <div v-else class="compact-empty">暂无回测历史。</div>
        </section>
      </div>
    </section>

    <section class="panel workspace-module analysis-panel">
      <div class="table-header">
        <div class="section-title">进阶分析</div>
      </div>

      <div class="analysis-tab-row">
        <button
          v-for="tab in analysisTabs"
          :key="tab.value"
          class="analysis-tab"
          :class="{ active: tab.value === analysisTab }"
          @click="analysisTab = tab.value"
        >
          <span>{{ tab.label }}</span>
          <small>{{ tab.hint }}</small>
        </button>
      </div>

      <div class="analysis-body">
        <template v-if="analysisTab === 'scan'">
          <div class="analysis-stack">
            <section class="analysis-surface">
              <div class="table-header">
                <div class="section-title">参数敏感性扫描</div>
              </div>
              <div class="analysis-control-bar">
                <div class="history-tools">
                  <div class="history-tools-label">
                    <span>扫描宽度</span>
                    <el-select v-model="scanWidth" class="history-select-control compact">
                      <el-option label="窄" :value="1" />
                      <el-option label="中" :value="2" />
                      <el-option label="宽" :value="3" />
                    </el-select>
                  </div>
                  <template v-if="sensitivityRows.length">
                    <div class="history-tools-label">
                      <span>指标</span>
                      <el-select v-model="sensitivityMetric" class="history-select-control">
                        <el-option v-for="item in sensitivityMetricOptions" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </div>
                    <div class="history-tools-label">
                      <span>成本场景</span>
                      <el-select v-model="sensitivityCost" class="history-select-control">
                        <el-option
                          v-for="value in sensitivityCostOptions"
                          :key="`cost-${value}`"
                          :label="`${value.toFixed(2)} bps`"
                          :value="value"
                        />
                      </el-select>
                    </div>
                  </template>
                </div>
                <div class="history-actions">
                  <el-button type="primary" :disabled="sensitivityLoading" @click="triggerSensitivityScan">
                    {{ sensitivityLoading ? "扫描中..." : "运行参数扫描" }}
                  </el-button>
                  <el-button plain :disabled="!selectedSensitivityPoint" @click="applySelectedSensitivity">套用已选参数</el-button>
                  <template v-if="sensitivityRows.length">
                    <el-button plain :disabled="!sensitivityBestSharpe" @click="applySensitivityRecommendation(sensitivityBestSharpe)">
                      最佳Sharpe
                    </el-button>
                    <el-button plain :disabled="!sensitivityBestAnnual" @click="applySensitivityRecommendation(sensitivityBestAnnual)">
                      最佳年化
                    </el-button>
                    <el-button plain :disabled="!sensitivityBestCalmar" @click="applySensitivityRecommendation(sensitivityBestCalmar)">
                      最佳Calmar
                    </el-button>
                  </template>
                </div>
              </div>
              <template v-if="sensitivityRows.length">
                <div class="chart-frame history-chart-frame">
                  <BacktestSensitivityHeatmap
                    :rows="sensitivityRows"
                    :metric="sensitivityMetric"
                    :trading-cost-bps="Number(sensitivityCost || 0)"
                    :selected-key="selectedSensitivityKey"
                    @select="handleSelectSensitivity"
                  />
                </div>
                <div class="history-list card-scroll">
                  <div
                    v-for="row in topSensitivityRows"
                    :key="`scan-${row.rebalance_days}-${row.top_n}-${row.trading_cost_bps}`"
                    class="history-row model-run-row clickable-row"
                    :class="{ selected: `${row.rebalance_days}-${row.top_n}-${row.trading_cost_bps}` === selectedSensitivityKey }"
                    @click="handleSelectSensitivity(row)"
                  >
                    <div>
                      <strong>{{ row.rebalance_days }}天 / {{ row.top_n }}只</strong>
                      <p class="subtle-caption">成本 {{ Number(row.trading_cost_bps).toFixed(2) }} bps</p>
                    </div>
                    <div>
                      <strong>{{ formatSensitivityValue(row) }}</strong>
                      <p class="subtle-caption">年化 {{ formatPct(row.annual_return, 2) }} · Sharpe {{ Number(row.sharpe || 0).toFixed(2) }}</p>
                    </div>
                    <el-button plain @click.stop="$emit('apply-sensitivity', row)">套用</el-button>
                  </div>
                </div>
              </template>
              <div v-else class="analysis-inline-empty">
                <p>暂无参数扫描结果。</p>
              </div>
            </section>

            <section class="analysis-surface">
              <div class="table-header">
                <div class="section-title">因子分层诊断（5分位）</div>
                <div v-if="factorLongShortSpread !== null" class="subtle-caption">Q1-Q5: {{ formatPct(factorLongShortSpread, 2) }}</div>
              </div>
              <div v-if="factorBucketRows.length" class="history-list">
                <div v-for="row in factorBucketRows" :key="row.bucket" class="history-row model-run-row">
                  <span>{{ row.bucket }}</span>
                  <strong>{{ row.count }}只</strong>
                  <span>均分 {{ row.avgScore.toFixed(3) }}</span>
                  <strong :class="{ positive: row.avgReturn5d >= 0, negative: row.avgReturn5d < 0 }">
                    5日均值 {{ formatPct(row.avgReturn5d, 2) }}
                  </strong>
                </div>
              </div>
              <div v-else class="analysis-inline-empty">
                <p>暂无分层诊断结果。</p>
              </div>
            </section>
          </div>
        </template>

        <template v-else-if="analysisTab === 'stability'">
          <div class="insight-grid balanced-grid-two">
            <section class="analysis-surface">
              <div class="table-header">
                <div class="section-title">滚动稳定性诊断</div>
              </div>
              <div class="analysis-control-bar">
                <div class="history-tools">
                  <div class="history-tools-label">
                    <span>指标</span>
                    <el-select v-model="stabilityMetric" class="history-select-control">
                      <el-option v-for="item in stabilityMetricOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </div>
                  <div class="history-tools-label">
                    <span>窗口</span>
                    <el-select v-model="stabilityWindow" class="history-select-control compact">
                      <el-option :value="10" label="10" />
                      <el-option :value="15" label="15" />
                      <el-option :value="20" label="20" />
                      <el-option :value="30" label="30" />
                      <el-option :value="40" label="40" />
                    </el-select>
                  </div>
                </div>
                <div class="history-actions">
                  <el-button type="primary" :disabled="stabilityLoading" @click="triggerStabilityRun">
                    {{ stabilityLoading ? "分析中..." : "运行稳定性分析" }}
                  </el-button>
                </div>
              </div>
              <template v-if="stabilityRollingPoints.length">
                <div class="chart-frame history-chart-frame">
                  <BacktestStabilityChart :points="stabilityRollingPoints" :metric="stabilityMetric" />
                </div>
                <div v-if="stabilitySummary" class="model-summary-grid compact-grid">
                  <div>
                    <span>月胜率</span>
                    <strong>{{ (Number(stabilitySummary.positive_month_ratio || 0) * 100).toFixed(1) }}%</strong>
                  </div>
                  <div>
                    <span>滚动Sharpe均值</span>
                    <strong>{{ Number(stabilitySummary.rolling_sharpe_mean || 0).toFixed(3) }}</strong>
                  </div>
                  <div>
                    <span>滚动Sharpe P10</span>
                    <strong>{{ Number(stabilitySummary.rolling_sharpe_p10 || 0).toFixed(3) }}</strong>
                  </div>
                  <div>
                    <span>最差滚动回撤</span>
                    <strong>{{ formatPct(stabilitySummary.rolling_max_drawdown_worst, 2) }}</strong>
                  </div>
                </div>
              </template>
              <div v-else class="compact-empty">暂无稳定性结果。</div>
            </section>

            <section class="analysis-surface">
              <div class="table-header">
                <div class="section-title">月度与市场状态表现</div>
              </div>
              <template v-if="stabilityMonthlyPoints.length">
                <div class="analysis-subsection">
                  <div class="analysis-subsection-title">月度表现</div>
                  <div class="history-list card-scroll">
                    <div v-for="row in stabilityMonthlyPoints.slice(-8).reverse()" :key="`month-${row.month}`" class="history-row model-run-row">
                      <span>{{ row.month }}</span>
                      <strong :class="{ positive: row.excess_return >= 0, negative: row.excess_return < 0 }">
                        超额 {{ formatPct(row.excess_return, 2) }}
                      </strong>
                      <span>胜率 {{ (Number(row.win_rate || 0) * 100).toFixed(1) }}%</span>
                    </div>
                  </div>
                </div>
                <div class="analysis-subsection">
                  <div class="analysis-subsection-title">市场状态</div>
                  <div class="history-list">
                    <div v-for="row in stabilityRegimeStats" :key="`regime-${row.regime}`" class="history-row model-run-row">
                      <span>{{ row.regime === "up" ? "上涨日" : row.regime === "down" ? "下跌日" : "平盘日" }}</span>
                      <strong>{{ row.days }} 天</strong>
                      <span :class="{ positive: row.annualized_excess_return >= 0, negative: row.annualized_excess_return < 0 }">
                        年化超额 {{ formatPct(row.annualized_excess_return, 2) }}
                      </span>
                    </div>
                  </div>
                </div>
              </template>
              <div v-else class="compact-empty">暂无月度与市场状态数据。</div>
            </section>
          </div>
        </template>

        <template v-else-if="analysisTab === 'scenario'">
          <section class="analysis-surface">
              <div class="table-header">
                <div class="section-title">策略情景对比</div>
                <div class="history-actions">
                <el-button type="primary" :disabled="scenarioLoading" @click="triggerScenarioRun">
                  {{ scenarioLoading ? "对比中..." : "运行情景对比" }}
                </el-button>
                <el-button plain :disabled="!scenarioChampion" @click="applyScenario(scenarioChampion)">
                  套用冠军方案
                </el-button>
              </div>
            </div>
            <template v-if="scenarioRows.length">
              <div class="history-list card-scroll">
                <div
                  v-for="row in scenarioRows"
                  :key="`scenario-${row.scenario_id}`"
                  class="history-row model-run-row"
                >
                  <div>
                    <strong>{{ row.scenario_name }}</strong>
                    <p class="subtle-caption">{{ row.description }}</p>
                    <p class="subtle-caption">{{ row.rebalance_days }}天 / {{ row.top_n }}只 / 成本 {{ Number(row.trading_cost_bps).toFixed(2) }}-{{ Number(row.slippage_bps).toFixed(2) }}</p>
                  </div>
                  <div>
                    <strong :class="{ positive: row.annual_return >= 0, negative: row.annual_return < 0 }">
                      年化 {{ formatPct(row.annual_return, 2) }}
                    </strong>
                    <p class="subtle-caption">Sharpe {{ Number(row.sharpe || 0).toFixed(2) }} · 回撤 {{ formatPct(row.max_drawdown, 2) }}</p>
                  </div>
                  <el-button plain @click="applyScenario(row)">套用</el-button>
                </div>
              </div>
            </template>
            <div v-else class="compact-empty">暂无情景对比结果。</div>
          </section>
        </template>

        <template v-else-if="analysisTab === 'montecarlo'">
          <section class="analysis-surface">
            <div class="table-header">
              <div class="section-title">Monte Carlo 鲁棒性分析</div>
            </div>
            <div class="analysis-control-bar">
              <div class="history-tools">
                <div class="history-tools-label">
                  <span>试验数</span>
                  <el-select v-model="monteCarloTrials" class="history-select-control compact">
                    <el-option :value="100" label="100" />
                    <el-option :value="300" label="300" />
                    <el-option :value="500" label="500" />
                    <el-option :value="800" label="800" />
                  </el-select>
                </div>
              </div>
              <div class="history-actions">
                <el-button type="primary" :disabled="monteCarloLoading" @click="triggerMonteCarloRun">
                  {{ monteCarloLoading ? "分析中..." : "运行 Monte Carlo" }}
                </el-button>
              </div>
            </div>
            <div v-if="monteCarloSummary" class="analysis-stack compact-stack">
              <div class="monte-summary-grid">
                <div class="result-summary-item">
                  <div>
                    <span>年化 P5</span>
                    <strong>{{ formatPct(monteCarloSummary.annual_return_p5, 2) }}</strong>
                  </div>
                </div>
                <div class="result-summary-item">
                  <div>
                    <span>年化 P50</span>
                    <strong>{{ formatPct(monteCarloSummary.annual_return_p50, 2) }}</strong>
                  </div>
                </div>
                <div class="result-summary-item">
                  <div>
                    <span>年化 P95</span>
                    <strong>{{ formatPct(monteCarloSummary.annual_return_p95, 2) }}</strong>
                  </div>
                </div>
                <div class="result-summary-item">
                  <div>
                    <span>亏损概率</span>
                    <strong>{{ (Number(monteCarloSummary.loss_probability || 0) * 100).toFixed(1) }}%</strong>
                  </div>
                </div>
                <div class="result-summary-item">
                  <div>
                    <span>跑输基准概率</span>
                    <strong>{{ (Number(monteCarloSummary.under_benchmark_probability || 0) * 100).toFixed(1) }}%</strong>
                  </div>
                </div>
                <div class="result-summary-item">
                  <div>
                    <span>回撤P95</span>
                    <strong>{{ formatPct(monteCarloSummary.max_drawdown_p95, 2) }}</strong>
                  </div>
                </div>
              </div>
              <div class="monte-chart-grid">
                <div class="chart-frame history-chart-frame">
                  <BacktestMonteCarloHistogram :bins="monteCarloAnnualBins" title="年化收益分布(%)" />
                </div>
                <div class="chart-frame history-chart-frame">
                  <BacktestMonteCarloHistogram :bins="monteCarloDrawdownBins" title="最大回撤分布(%)" />
                </div>
              </div>
            </div>
            <div v-else class="compact-empty">暂无 Monte Carlo 结果。</div>
          </section>
        </template>
      </div>
    </section>
  </section>
</template>

<style scoped lang="scss">
.backtest-workspace {
  display: grid;
  gap: 20px;
}

.workspace-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.workspace-meta.inline {
  justify-content: flex-start;
  margin-top: 8px;
}

.workspace-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 11px;
  background: rgba(22, 101, 52, 0.08);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.workspace-pill.muted {
  background: rgba(107, 114, 128, 0.08);
  color: var(--muted);
}

.workspace-pill.subtle {
  background: rgba(243, 181, 70, 0.14);
  color: #8a5d17;
}

.workspace-flow {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  padding: 10px 0 2px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.workspace-flow span:first-child {
  color: var(--accent);
}

.workspace-module {
  margin-top: 0;
  padding: 22px 24px;
  border-radius: 8px;
  border-color: rgba(32, 43, 35, 0.07);
  background: rgba(255, 252, 247, 0.84);
  box-shadow: none;
}

.workspace-results-module {
  min-width: 0;
  display: grid;
  gap: 18px;
}

.results-layout {
  align-items: stretch;
}

.result-col {
  min-width: 0;
  display: flex;
}

.result-chart-area {
  min-width: 0;
  width: 100%;
  display: flex;
}

.workspace-chart-frame {
  min-height: 320px;
  width: 100%;
  height: 100%;
}

.workspace-chart-frame :deep(.equity-echart),
.workspace-chart-frame :deep(.echart-shell) {
  height: 100%;
  min-height: 320px;
}

.workspace-block-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.workspace-block-head-main {
  min-width: 0;
}

.workspace-block-head.compact {
  align-items: center;
}

.current-signal-panel {
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
  width: 100%;
  padding: 18px;
  border: 1px solid rgba(32, 43, 35, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.48);
  height: 100%;
  grid-auto-rows: min-content;
}

.signal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.signal-subhead,
.signal-section-title {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.signal-subhead {
  margin-top: 4px;
}

.signal-focus-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0 12px;
  border-bottom: 1px solid rgba(32, 43, 35, 0.08);
}

.signal-focus-main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.signal-score-card {
  min-width: 120px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(22, 101, 52, 0.08);
  border: 1px solid rgba(22, 101, 52, 0.1);
  text-align: right;
}

.signal-score-card span {
  display: block;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.signal-score-card strong {
  display: block;
  margin-top: 6px;
  color: var(--accent);
  font-size: 28px;
  line-height: 1;
}

.signal-metric-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.signal-metric {
  min-width: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(32, 43, 35, 0.06);
}

.signal-metric span,
.result-summary-item span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.signal-metric strong,
.result-summary-item strong {
  display: block;
  margin-top: 5px;
  font-size: 16px;
  line-height: 1.25;
}

.result-summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(32, 43, 35, 0.08);
}

.result-summary-item {
  min-width: 0;
}

.result-summary-item.primary strong {
  color: var(--accent);
}

.result-summary-item small {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 12px;
}

.focus-symbol {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0;
}

.focus-name {
  margin: 0;
  color: var(--muted);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.2;
}

.signal-metric-section {
  display: grid;
  gap: 0;
  padding-top: 2px;
}

.workspace-metric-grid,
.workspace-kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 18px;
  margin-top: 14px;
}

.workspace-metric,
.workspace-kv {
  padding: 6px 0;
  min-width: 0;
}

.workspace-metric span,
.workspace-kv span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.workspace-metric strong,
.workspace-kv strong {
  display: block;
  margin-top: 6px;
  font-size: 15px;
  line-height: 1.3;
}

.control-stack {
  display: grid;
  gap: 20px;
  margin-top: 18px;
}

.control-section {
  display: grid;
  gap: 14px;
}

.control-card {
  padding: 18px 20px 20px;
  border: 1px solid rgba(32, 43, 35, 0.07);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.42);
  width: 100%;
}

.control-card-compact {
  padding: 16px 18px 18px;
}

.control-card-wide {
  padding-bottom: 18px;
}

.control-overview-card {
  gap: 16px;
}

.control-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.compact-row {
  margin-top: 0;
}

.parameter-form {
  margin-top: 2px;
}

.parameter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 10px 12px;
}

.parameter-grid-compact {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.control-summary-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(32, 43, 35, 0.08);
}

.control-summary-item {
  min-width: 0;
}

.control-summary-item span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.control-summary-item strong {
  display: block;
  margin-top: 6px;
  font-size: 15px;
  line-height: 1.3;
}

.workspace-callout {
  padding: 12px 14px 0;
  border-left: 0;
  border-top: 1px solid rgba(32, 43, 35, 0.08);
}

.workspace-callout strong {
  display: block;
  margin-bottom: 6px;
}

.analysis-panel {
  background: rgba(255, 251, 245, 0.74);
}

.analysis-tab-row {
  display: flex;
  gap: 18px;
  margin-top: 14px;
  padding-bottom: 8px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(32, 43, 35, 0.08);
}

.analysis-tab {
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  padding: 4px 0 12px;
  min-width: 120px;
  text-align: left;
  font: inherit;
  cursor: pointer;
  display: grid;
  gap: 4px;
  border-bottom: 2px solid transparent;
}

.analysis-tab span {
  font-weight: 700;
}

.analysis-tab small {
  color: var(--muted);
  font-size: 12px;
}

.analysis-tab.active {
  border-bottom-color: rgba(22, 101, 52, 0.38);
  color: var(--accent);
}

.analysis-body {
  margin-top: 6px;
}

.analysis-control-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 16px;
  flex-wrap: wrap;
}

.analysis-control-bar .history-tools,
.analysis-control-bar .history-actions {
  margin-top: 0;
}

.analysis-control-bar .history-actions {
  margin-left: auto;
}

.analysis-stack {
  display: grid;
  gap: 26px;
}

.analysis-stack.compact-stack {
  gap: 18px;
}

.analysis-surface,
.analysis-surface-sub {
  display: grid;
  gap: 12px;
  padding: 18px 20px 20px;
  min-width: 0;
  border: 1px solid rgba(32, 43, 35, 0.07);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.44);
}

.analysis-inline-empty {
  padding: 8px 0 0;
  color: var(--muted);
  font-size: 0.96rem;
  line-height: 1.6;
}

.analysis-inline-empty p {
  margin: 0;
}

.analysis-subsection {
  display: grid;
  gap: 10px;
}

.analysis-subsection-title {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.monte-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 18px;
  padding-bottom: 6px;
}

.monte-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.analysis-surface-sub {
  padding-top: 18px;
}

.analysis-surface .chart-frame,
.analysis-surface-sub .chart-frame {
  box-shadow: none;
}

.analysis-surface .history-list,
.analysis-surface-sub .history-list {
  margin-top: 0;
}

.preset-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px auto;
  gap: 12px;
  margin-top: 4px;
}

.preset-toolbar-wide {
  grid-template-columns: minmax(260px, 1fr) 180px auto;
  margin-top: 0;
}

.preset-input {
  margin-top: 0;
}

.preset-tag-select {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
  color: var(--text);
  background: rgba(255, 255, 255, 0.72);
}

.preset-sync-row {
  display: flex;
  align-items: center;
  gap: 8px 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.preset-sync-button {
  padding: 8px 12px;
  font-size: 13px;
}

.preset-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.preset-filter-chip {
  border: 1px solid rgba(32, 43, 35, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  padding: 5px 11px;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.preset-filter-chip.active {
  border-color: rgba(22, 101, 52, 0.22);
  background: rgba(22, 101, 52, 0.08);
  color: var(--accent);
}

.preset-filter-chip.utility {
  background: transparent;
  border-style: dashed;
}

.preset-filter-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.preset-filter-count {
  display: inline-flex;
  min-width: 16px;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  color: inherit;
  opacity: 0.85;
}

.file-trigger {
  position: relative;
  overflow: hidden;
}

.file-hidden-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.preset-strip {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.preset-chip {
  min-width: 0;
  padding: 14px 16px 12px;
  border-radius: 8px;
  border: 1px solid rgba(32, 43, 35, 0.08);
  background: rgba(255, 255, 255, 0.52);
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 6px;
  font: inherit;
  color: var(--text);
  align-content: start;
}

.preset-chip span,
.preset-chip small {
  display: block;
}

.preset-chip-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.preset-chip-badges {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

.preset-chip-title {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.3;
  word-break: break-word;
}

.preset-chip small {
  color: var(--muted);
  font-size: 12px;
}

.preset-chip-summary {
  line-height: 1.5;
}

.preset-tag-badge {
  display: inline-flex;
  flex-shrink: 0;
  width: fit-content;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(32, 43, 35, 0.1);
  background: rgba(32, 43, 35, 0.04);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.preset-meta {
  font-size: 12px;
  opacity: 0.9;
}

.preset-chip.active {
  border-color: rgba(22, 101, 52, 0.18);
  box-shadow: 0 0 0 1px rgba(22, 101, 52, 0.08);
  background: rgba(248, 252, 249, 0.92);
}

.preset-chip.pinned {
  border-color: rgba(22, 101, 52, 0.22);
}

.preset-chip-actions {
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px solid rgba(32, 43, 35, 0.08);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.preset-action {
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 11px;
  font-weight: 400;
  padding: 0;
  cursor: pointer;
  min-width: 0;
}

.preset-action:deep(.el-button) {
  font-weight: 400;
}

.preset-action.active {
  color: var(--accent);
}

.preset-action.danger {
  color: #a1532f;
}

.preset-action + .preset-action::before {
  content: "·";
  margin-right: 6px;
  color: rgba(32, 43, 35, 0.22);
}

.preset-empty {
  padding: 12px 2px;
  white-space: normal;
}

.list-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.run-history-row {
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 18px;
  padding: 14px 16px;
}

.run-history-main,
.run-history-metrics {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.run-history-time,
.run-history-kpi {
  font-size: 16px;
  line-height: 1.3;
  font-weight: 600;
}

.run-history-summary,
.run-history-meta {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
}

.run-history-metrics {
  justify-items: end;
  text-align: right;
}

.run-history-action {
  display: flex;
  align-items: center;
}

.run-history-row.selected {
  background: rgba(22, 101, 52, 0.05);
  box-shadow: inset 3px 0 0 rgba(22, 101, 52, 0.24);
}

@media (max-width: 1100px) {
  .workspace-meta {
    justify-content: flex-start;
  }

  .results-layout,
  .result-summary-strip {
    grid-template-columns: 1fr;
  }

  .parameter-grid,
  .parameter-grid-compact,
  .control-summary-strip,
  .monte-summary-grid,
  .monte-chart-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .run-history-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .run-history-action {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
}

@media (max-width: 900px) {
  .workspace-block-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .workspace-metric-grid,
  .workspace-kv-grid,
  .signal-metric-list,
  .monte-summary-grid,
  .monte-chart-grid {
    grid-template-columns: 1fr;
  }

  .signal-focus-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .signal-score-card {
    width: 100%;
    text-align: left;
  }

  .parameter-grid,
  .config-definition-grid,
  .preset-toolbar {
    grid-template-columns: 1fr;
  }

  .control-section-head {
    align-items: flex-start;
  }

  .run-history-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .run-history-metrics {
    justify-items: start;
    text-align: left;
  }

  .run-history-action {
    grid-column: auto;
    grid-row: auto;
  }
}
</style>
