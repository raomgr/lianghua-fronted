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
  presetSyncMessage: { type: String, default: "" },
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

const displayedRunHistory = computed(() => {
  const list = props.backtestRunHistory || [];
  const option = historyWindowOptions.find((item) => item.value === historyWindow.value) ?? historyWindowOptions[1];
  if (!Number.isFinite(option.count)) {
    return list;
  }
  return list.slice(0, option.count);
});
const selectedHistoryItem = computed(() => displayedRunHistory.value.find((item) => item.id === selectedHistoryId.value) ?? null);

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
    return;
  }
  if (!rows.some((item) => item.id === selectedHistoryId.value)) {
    selectedHistoryId.value = rows[0].id;
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

function hexToRgba(hex, alpha) {
  const normalized = String(hex || "").trim().replace("#", "");
  const fullHex = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return `rgba(75, 85, 99, ${alpha})`;
  }

  const red = Number.parseInt(fullHex.slice(0, 2), 16);
  const green = Number.parseInt(fullHex.slice(2, 4), 16);
  const blue = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getTagColor(tag) {
  return props.presetTagColorMap?.[tag] || "#4b5563";
}

function getFilterChipStyle(tag) {
  const color = getTagColor(tag);
  return {
    borderColor: hexToRgba(color, 0.3),
    color,
    background: hexToRgba(color, 0.08),
  };
}

function getTagBadgeStyle(tag) {
  const color = getTagColor(tag);
  return {
    borderColor: hexToRgba(color, 0.3),
    color,
    background: hexToRgba(color, 0.12),
  };
}

function formatPct(value, digits = 2) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

function handleSelectHistory(entryId) {
  selectedHistoryId.value = String(entryId || "");
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
  <section class="panel section-panel">
    <div class="table-header">
      <div class="section-title">策略回测</div>
    </div>

    <section class="chart-card chart-embedded">
      <div class="chart-frame">
        <EquityCurveChart :equity-curve="backtest.equity_curve" />
      </div>
    </section>

    <div class="insight-grid balanced-grid-two">
      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">回测参数</div>
        </div>
        <div class="model-summary-grid compact-grid">
          <label>
            <span>调仓天数</span>
            <input :value="controls.rebalance_days" type="number" min="1" max="20" @input="updateControl('rebalance_days', Number($event.target.value))">
          </label>
          <label>
            <span>持仓数量</span>
            <input :value="controls.top_n" type="number" min="1" max="10" @input="updateControl('top_n', Number($event.target.value))">
          </label>
          <label>
            <span>手续费(bps)</span>
            <input :value="controls.trading_cost_bps" type="number" min="0" max="100" @input="updateControl('trading_cost_bps', Number($event.target.value))">
          </label>
          <label>
            <span>滑点(bps)</span>
            <input :value="controls.slippage_bps" type="number" min="0" max="100" @input="updateControl('slippage_bps', Number($event.target.value))">
          </label>
        </div>
        <div class="preset-toolbar">
          <input v-model="presetNameModel" class="search-input preset-input" placeholder="给这组参数起个名字">
          <select v-model="presetTagModel" class="preset-tag-select">
            <option v-for="tag in presetTagOptions" :key="tag" :value="tag">{{ tag }}</option>
          </select>
          <button class="secondary-button" @click="$emit('save-preset')">保存方案</button>
        </div>
        <div class="preset-sync-row">
          <button class="secondary-button preset-sync-button" :disabled="!savedPresets.length" @click="$emit('export-presets')">
            导出 JSON
          </button>
          <label class="secondary-button preset-sync-button file-trigger">
            导入 JSON
            <input class="file-hidden-input" type="file" accept="application/json,.json" @change="handleImportFile">
          </label>
          <span v-if="presetSyncMessage" class="subtle-caption">{{ presetSyncMessage }}</span>
        </div>
        <div class="preset-filter-row">
          <button
            v-for="pill in presetFilterPills"
            :key="`filter-${pill.tag}`"
            class="preset-filter-chip"
            :class="{ active: pill.tag === presetTagFilter }"
            :style="getFilterChipStyle(pill.tag)"
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
            v-for="preset in filteredPresets"
            :key="preset.id"
            class="preset-chip"
            :class="{ active: preset.id === activePresetId, pinned: preset.id === defaultPresetId }"
            role="button"
            tabindex="0"
            @click="$emit('apply-preset', preset.id)"
            @keydown.enter.prevent="$emit('apply-preset', preset.id)"
            @keydown.space.prevent="$emit('apply-preset', preset.id)"
          >
            <span>{{ preset.name }}</span>
            <small class="preset-tag-badge" :style="getTagBadgeStyle(preset.tag || '未分类')">{{ preset.tag || "未分类" }}</small>
            <small>
              {{ preset.controls.rebalance_days }}天 / {{ preset.controls.top_n }}股 / {{ preset.controls.trading_cost_bps }}-{{ preset.controls.slippage_bps }}
            </small>
            <small v-if="preset.last_used_at" class="preset-meta">最近使用 {{ formatPresetTime(preset.last_used_at) }}</small>
            <div class="preset-chip-actions">
              <button
                class="preset-action"
                :class="{ active: preset.id === defaultPresetId }"
                @click.stop="$emit('set-default-preset', preset.id)"
              >
                {{ preset.id === defaultPresetId ? "默认" : "设为默认" }}
              </button>
              <button class="preset-action" @click.stop="handleRetagPreset(preset)">标签</button>
              <button class="preset-action" @click.stop="$emit('duplicate-preset', preset.id)">复制</button>
              <button class="preset-action" @click.stop="handleRenamePreset(preset)">改名</button>
              <button class="preset-action danger" @click.stop="$emit('delete-preset', preset.id)">删除</button>
            </div>
          </article>
          <div v-if="!savedPresets.length" class="subtle-caption preset-empty">还没有保存方案，调好参数后可以先存一份。</div>
          <div v-else-if="!filteredPresets.length" class="subtle-caption preset-empty">当前标签下暂无方案。</div>
        </div>
        <div class="hero-actions compact-actions">
          <button class="primary-button" :disabled="backtesting" @click="$emit('run')">
            {{ backtesting ? "回测中..." : "重新运行回测" }}
          </button>
          <button class="secondary-button" :disabled="!backtest?.equity_curve?.length" @click="$emit('export-backtest')">导出曲线CSV</button>
        </div>
      </section>

      <section class="panel compact-panel spotlight equal-card">
        <div class="section-title">当前优选股票</div>
        <div class="card-scroll">
          <template v-if="topPick">
            <div class="spotlight-symbol">{{ topPick.symbol }}</div>
            <div class="spotlight-score">Alpha Score {{ (topPick.score ?? 0).toFixed(3) }}</div>
            <p>{{ topPickName }}</p>
            <p>5日收益：{{ (topPick.return_5d * 100).toFixed(2) }}%</p>
            <p>20日动量：{{ (topPick.momentum_20 * 100).toFixed(2) }}%</p>
            <p>20日波动：{{ (topPick.volatility_20 * 100).toFixed(2) }}%</p>
            <p>5日量比：{{ topPick.volume_ratio_5.toFixed(2) }}</p>
          </template>
          <p v-else>暂无数据</p>
        </div>
      </section>
    </div>

    <div class="insight-grid balanced-grid-two">
      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">参数敏感性扫描</div>
          <div class="history-actions">
            <label class="history-tools-label">
              <span>扫描宽度</span>
              <select v-model="scanWidth" class="history-select compact">
                <option :value="1">窄</option>
                <option :value="2">中</option>
                <option :value="3">宽</option>
              </select>
            </label>
            <button class="secondary-button" :disabled="sensitivityLoading" @click="triggerSensitivityScan">
              {{ sensitivityLoading ? "扫描中..." : "运行参数扫描" }}
            </button>
            <button class="secondary-button" :disabled="!selectedSensitivityPoint" @click="applySelectedSensitivity">套用已选参数</button>
          </div>
        </div>
        <template v-if="sensitivityRows.length">
          <div class="history-actions">
            <button class="secondary-button" :disabled="!sensitivityBestSharpe" @click="applySensitivityRecommendation(sensitivityBestSharpe)">
              最佳Sharpe
            </button>
            <button class="secondary-button" :disabled="!sensitivityBestAnnual" @click="applySensitivityRecommendation(sensitivityBestAnnual)">
              最佳年化
            </button>
            <button class="secondary-button" :disabled="!sensitivityBestCalmar" @click="applySensitivityRecommendation(sensitivityBestCalmar)">
              最佳Calmar
            </button>
          </div>
          <div class="history-tools">
            <label>
              <span>指标</span>
              <select v-model="sensitivityMetric" class="history-select">
                <option v-for="item in sensitivityMetricOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
            <label>
              <span>成本场景</span>
              <select v-model="sensitivityCost" class="history-select">
                <option v-for="value in sensitivityCostOptions" :key="`cost-${value}`" :value="value">{{ value.toFixed(2) }} bps</option>
              </select>
            </label>
          </div>
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
              <button class="secondary-button" @click.stop="$emit('apply-sensitivity', row)">套用</button>
            </div>
          </div>
        </template>
        <div v-else class="compact-empty">先运行一次参数扫描，就能看到热力图和候选组合。</div>
      </section>

      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">因子分层诊断（5分位）</div>
          <div v-if="factorLongShortSpread !== null" class="subtle-caption">Q1-Q5: {{ formatPct(factorLongShortSpread, 2) }}</div>
        </div>
        <div v-if="factorBucketRows.length" class="history-list card-scroll">
          <div v-for="row in factorBucketRows" :key="row.bucket" class="history-row model-run-row">
            <span>{{ row.bucket }}</span>
            <strong>{{ row.count }}只</strong>
            <span>均分 {{ row.avgScore.toFixed(3) }}</span>
            <strong :class="{ positive: row.avgReturn5d >= 0, negative: row.avgReturn5d < 0 }">
              5日均值 {{ formatPct(row.avgReturn5d, 2) }}
            </strong>
          </div>
        </div>
        <div v-else class="compact-empty">当前股票池太小，暂时无法做5分位诊断。</div>
      </section>
    </div>

    <div class="insight-grid balanced-grid-two">
      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">滚动稳定性诊断</div>
          <div class="history-actions">
            <label class="history-tools-label">
              <span>窗口</span>
              <select v-model="stabilityWindow" class="history-select compact">
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
                <option :value="30">30</option>
                <option :value="40">40</option>
              </select>
            </label>
            <button class="secondary-button" :disabled="stabilityLoading" @click="triggerStabilityRun">
              {{ stabilityLoading ? "分析中..." : "运行稳定性分析" }}
            </button>
          </div>
        </div>
        <template v-if="stabilityRollingPoints.length">
          <div class="history-tools">
            <label>
              <span>指标</span>
              <select v-model="stabilityMetric" class="history-select">
                <option v-for="item in stabilityMetricOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
            <span class="subtle-caption">滚动窗口 {{ props.stabilityReport?.rolling_window || stabilityWindow }} 天</span>
          </div>
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
        <div v-else class="compact-empty">点击运行后可查看策略在不同市场阶段的稳定性。</div>
      </section>

      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">月度与市场状态表现</div>
        </div>
        <template v-if="stabilityMonthlyPoints.length">
          <div class="history-list card-scroll">
            <div v-for="row in stabilityMonthlyPoints.slice(-8).reverse()" :key="`month-${row.month}`" class="history-row model-run-row">
              <span>{{ row.month }}</span>
              <strong :class="{ positive: row.excess_return >= 0, negative: row.excess_return < 0 }">
                超额 {{ formatPct(row.excess_return, 2) }}
              </strong>
              <span>胜率 {{ (Number(row.win_rate || 0) * 100).toFixed(1) }}%</span>
            </div>
          </div>
          <div class="history-list">
            <div v-for="row in stabilityRegimeStats" :key="`regime-${row.regime}`" class="history-row model-run-row">
              <span>{{ row.regime === "up" ? "上涨日" : row.regime === "down" ? "下跌日" : "平盘日" }}</span>
              <strong>{{ row.days }} 天</strong>
              <span :class="{ positive: row.annualized_excess_return >= 0, negative: row.annualized_excess_return < 0 }">
                年化超额 {{ formatPct(row.annualized_excess_return, 2) }}
              </span>
            </div>
          </div>
        </template>
        <div v-else class="compact-empty">稳定性分析完成后，这里会显示月度与牛熊分段表现。</div>
      </section>

      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">回测运行历史</div>
          <div class="history-actions">
            <button class="secondary-button" :disabled="!backtestRunHistory.length" @click="$emit('export-history')">导出历史CSV</button>
            <button class="secondary-button" :disabled="!selectedHistoryItem" @click="applySelectedHistory">套用已选</button>
            <button class="secondary-button" :disabled="!backtestRunHistory.length" @click="$emit('clear-history')">清空</button>
          </div>
        </div>
        <div class="history-tools">
          <label>
            <span>范围</span>
            <select v-model="historyWindow" class="history-select">
              <option v-for="item in historyWindowOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label>
            <span>X轴</span>
            <select v-model="historyXAxis" class="history-select">
              <option v-for="item in historyMetricOptions" :key="`x-${item.value}`" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label>
            <span>Y轴</span>
            <select v-model="historyYAxis" class="history-select">
              <option v-for="item in historyMetricOptions" :key="`y-${item.value}`" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label>
            <span>点大小</span>
            <select v-model="historySize" class="history-select">
              <option v-for="item in historyMetricOptions" :key="`size-${item.value}`" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
        </div>
        <p class="subtle-caption history-chart-legend">散点为历史回测，橙色菱形与虚线表示 Pareto 前沿。</p>
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
        <div v-if="displayedRunHistory.length" class="history-list card-scroll">
          <div
            v-for="item in displayedRunHistory"
            :key="item.id"
            class="history-row model-run-row clickable-row"
            :class="{ selected: item.id === selectedHistoryId }"
            @click="handleSelectHistory(item.id)"
          >
            <div>
              <strong>{{ formatPresetTime(item.run_at) }}</strong>
              <p class="subtle-caption">
                {{ item.controls.rebalance_days }}天 / {{ item.controls.top_n }}股 / {{ item.controls.trading_cost_bps }}-{{ item.controls.slippage_bps }}
              </p>
            </div>
            <div>
              <strong>年化 {{ formatPct(item.summary.annual_return, 2) }}</strong>
              <p class="subtle-caption">Sharpe {{ Number(item.summary.sharpe || 0).toFixed(2) }} · 回撤 {{ formatPct(item.summary.max_drawdown, 2) }}</p>
            </div>
            <button class="secondary-button" @click.stop="$emit('apply-history', item.id)">套用</button>
          </div>
        </div>
        <div v-else class="compact-empty">运行回测后，会在这里保留本地历史记录。</div>
      </section>
    </div>

    <section class="panel compact-panel section-panel">
      <div class="table-header">
        <div class="section-title">策略情景对比</div>
        <div class="history-actions">
          <button class="secondary-button" :disabled="scenarioLoading" @click="triggerScenarioRun">
            {{ scenarioLoading ? "对比中..." : "运行情景对比" }}
          </button>
          <button class="secondary-button" :disabled="!scenarioChampion" @click="applyScenario(scenarioChampion)">
            套用冠军方案
          </button>
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
            <button class="secondary-button" @click="applyScenario(row)">套用</button>
          </div>
        </div>
      </template>
      <div v-else class="compact-empty">点击运行后可快速对比不同风格参数的收益与风险表现。</div>
    </section>

    <section class="panel compact-panel section-panel">
      <div class="table-header">
        <div class="section-title">Monte Carlo 鲁棒性分析</div>
        <div class="history-actions">
          <label class="history-tools-label">
            <span>试验数</span>
            <select v-model="monteCarloTrials" class="history-select compact">
              <option :value="100">100</option>
              <option :value="300">300</option>
              <option :value="500">500</option>
              <option :value="800">800</option>
            </select>
          </label>
          <button class="secondary-button" :disabled="monteCarloLoading" @click="triggerMonteCarloRun">
            {{ monteCarloLoading ? "分析中..." : "运行 Monte Carlo" }}
          </button>
        </div>
      </div>
      <div v-if="monteCarloSummary" class="insight-grid balanced-grid-two">
        <section class="panel compact-panel equal-card">
          <div class="model-summary-grid compact-grid">
            <div>
              <span>年化 P5</span>
              <strong>{{ formatPct(monteCarloSummary.annual_return_p5, 2) }}</strong>
            </div>
            <div>
              <span>年化 P50</span>
              <strong>{{ formatPct(monteCarloSummary.annual_return_p50, 2) }}</strong>
            </div>
            <div>
              <span>年化 P95</span>
              <strong>{{ formatPct(monteCarloSummary.annual_return_p95, 2) }}</strong>
            </div>
            <div>
              <span>亏损概率</span>
              <strong>{{ (Number(monteCarloSummary.loss_probability || 0) * 100).toFixed(1) }}%</strong>
            </div>
            <div>
              <span>跑输基准概率</span>
              <strong>{{ (Number(monteCarloSummary.under_benchmark_probability || 0) * 100).toFixed(1) }}%</strong>
            </div>
            <div>
              <span>回撤P95</span>
              <strong>{{ formatPct(monteCarloSummary.max_drawdown_p95, 2) }}</strong>
            </div>
          </div>
          <div class="chart-frame history-chart-frame">
            <BacktestMonteCarloHistogram :bins="monteCarloAnnualBins" title="年化收益分布(%)" />
          </div>
        </section>
        <section class="panel compact-panel equal-card">
          <div class="chart-frame history-chart-frame">
            <BacktestMonteCarloHistogram :bins="monteCarloDrawdownBins" title="最大回撤分布(%)" />
          </div>
        </section>
      </div>
      <div v-else class="compact-empty">点击运行后可看到策略未来路径的收益与回撤分布区间。</div>
    </section>
  </section>
</template>
