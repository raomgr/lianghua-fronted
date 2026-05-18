import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  addBacktestPresetTag,
  clearBacktestRunHistory as clearBacktestRunHistoryRequest,
  createBacktestPreset,
  createBacktestRunHistory,
  deleteBacktestPreset as deleteBacktestPresetRequest,
  fetchBacktest,
  fetchBacktestPresets,
  fetchBacktestRunHistory,
  fetchBacktestMonteCarlo,
  fetchBacktestScenarios,
  fetchBacktestSensitivity,
  fetchBacktestStability,
  removeBacktestPresetTag as removeBacktestPresetTagRequest,
  setDefaultBacktestPreset as setDefaultBacktestPresetRequest,
  updateBacktestPreset,
  useBacktestPreset,
} from "../../services/market";
import { DEFAULT_BACKTEST_CONTROLS } from "./constants";

const BACKTEST_PRESETS_KEY = "ashare.backtest.presets.v1";
const BACKTEST_DEFAULT_PRESET_KEY = "ashare.backtest.presets.default.v1";
const BACKTEST_CUSTOM_TAGS_KEY = "ashare.backtest.presets.tags.v1";
const BACKTEST_RUN_HISTORY_KEY = "ashare.backtest.run.history.v1";
const PRESET_TAG_OPTIONS = ["通用", "稳健", "激进", "测试"];
const BUILT_IN_TAG_COLORS = {
  通用: "#2f7d57",
  稳健: "#2b6cb0",
  激进: "#c05621",
  测试: "#7b3fa0",
  未分类: "#6b7280",
};
const CUSTOM_TAG_COLOR_POOL = ["#0f766e", "#7c3aed", "#2563eb", "#b45309", "#be185d", "#166534"];

function normalizeTag(value) {
  const next = String(value ?? "").trim();
  return next || "未分类";
}

function isBuiltInTag(value) {
  return PRESET_TAG_OPTIONS.includes(value);
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getTagColor(value) {
  const tag = normalizeTag(value);
  if (BUILT_IN_TAG_COLORS[tag]) {
    return BUILT_IN_TAG_COLORS[tag];
  }

  const index = hashString(tag) % CUSTOM_TAG_COLOR_POOL.length;
  return CUSTOM_TAG_COLOR_POOL[index];
}

function normalizeControls(value = {}) {
  return {
    backtest_mode: String(value.backtest_mode ?? DEFAULT_BACKTEST_CONTROLS.backtest_mode ?? "rule"),
    rebalance_days: Number(value.rebalance_days ?? DEFAULT_BACKTEST_CONTROLS.rebalance_days),
    top_n: Number(value.top_n ?? DEFAULT_BACKTEST_CONTROLS.top_n),
    trading_cost_bps: Number(value.trading_cost_bps ?? DEFAULT_BACKTEST_CONTROLS.trading_cost_bps),
    slippage_bps: Number(value.slippage_bps ?? DEFAULT_BACKTEST_CONTROLS.slippage_bps),
  };
}

function buildPresetLabel(controls) {
  const modeLabel = controls.backtest_mode === "model" ? "模型" : "规则";
  return `${modeLabel} / ${controls.rebalance_days}天 / ${controls.top_n}股 / 成本${controls.trading_cost_bps}-${controls.slippage_bps}`;
}

function toTimestamp(value) {
  const ts = Date.parse(value ?? "");
  return Number.isNaN(ts) ? 0 : ts;
}

function sortPresets(presets, defaultPresetId = "") {
  return [...presets].sort((a, b) => {
    const aDefault = a.id === defaultPresetId;
    const bDefault = b.id === defaultPresetId;
    if (aDefault !== bDefault) {
      return aDefault ? -1 : 1;
    }

    const aUsed = toTimestamp(a.last_used_at || a.created_at);
    const bUsed = toTimestamp(b.last_used_at || b.created_at);
    if (aUsed !== bUsed) {
      return bUsed - aUsed;
    }

    return toTimestamp(b.created_at) - toTimestamp(a.created_at);
  });
}

function readStoredPresets() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(BACKTEST_PRESETS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        id: item.id,
        name: item.name,
        tag: normalizeTag(item.tag),
        controls: normalizeControls(item.controls),
        created_at: item.created_at || new Date(Number(item.id) || Date.now()).toISOString(),
        last_used_at: item.last_used_at || item.created_at || new Date(Number(item.id) || Date.now()).toISOString(),
      }))
      .filter((item) => item.id && item.name);
  } catch {
    return [];
  }
}

function readDefaultPresetId(savedPresets = []) {
  if (typeof window === "undefined") {
    return "";
  }

  const value = window.localStorage.getItem(BACKTEST_DEFAULT_PRESET_KEY) ?? "";
  if (!value) {
    return "";
  }

  return savedPresets.some((item) => item.id === value) ? value : "";
}

function readCustomTags() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(BACKTEST_CUSTOM_TAGS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeTag(item))
      .filter((tag) => tag && tag !== "全部" && tag !== "未分类" && !isBuiltInTag(tag));
  } catch {
    return [];
  }
}

function getPresetExportPayload(presets, defaultPresetId) {
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    default_preset_id: defaultPresetId || "",
    presets: presets.map((item) => ({
      id: item.id,
      name: item.name,
      tag: normalizeTag(item.tag),
      controls: normalizeControls(item.controls),
      created_at: item.created_at,
      last_used_at: item.last_used_at,
    })),
  };
}

function getNextPresetId() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function getDuplicatePresetName(baseName, presets) {
  const names = new Set(presets.map((item) => item.name));
  const seed = `${baseName} 副本`;
  if (!names.has(seed)) {
    return seed;
  }

  let suffix = 2;
  let candidate = `${seed}${suffix}`;
  while (names.has(candidate)) {
    suffix += 1;
    candidate = `${seed}${suffix}`;
  }
  return candidate;
}

function readBacktestRunHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(BACKTEST_RUN_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        id: String(item?.id ?? ""),
        run_at: String(item?.run_at ?? ""),
        controls: normalizeControls(item?.controls),
        summary: item?.summary ?? {},
      }))
      .filter((item) => item.id && item.run_at);
  } catch {
    return [];
  }
}

function clearLegacyBacktestStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(BACKTEST_PRESETS_KEY);
  window.localStorage.removeItem(BACKTEST_DEFAULT_PRESET_KEY);
  window.localStorage.removeItem(BACKTEST_CUSTOM_TAGS_KEY);
  window.localStorage.removeItem(BACKTEST_RUN_HISTORY_KEY);
}

async function loadAllBacktestPresets(tag = "全部", pageSize = 100) {
  let page = 1;
  let total = 0;
  let defaultPresetId = "";
  let customTags = [];
  const items = [];

  do {
    const result = await fetchBacktestPresets({ page, pageSize, tag });
    items.push(...(result.items || []));
    total = Number(result.total || 0);
    defaultPresetId = result.default_preset_id || defaultPresetId;
    customTags = result.custom_tags || customTags;
    page += 1;
  } while (items.length < total);

  return { items, defaultPresetId, customTags };
}

async function loadAllBacktestRunHistory(pageSize = 100) {
  let page = 1;
  let total = 0;
  const items = [];

  do {
    const result = await fetchBacktestRunHistory({ page, pageSize });
    items.push(...(result.items || []));
    total = Number(result.total || 0);
    page += 1;
  } while (items.length < total);

  return items;
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

export function useBacktestState(errorRef) {
  const storedPresets = readStoredPresets();
  const storedDefaultPresetId = readDefaultPresetId(storedPresets);
  const normalizedPresets = sortPresets(storedPresets, storedDefaultPresetId);
  const initialPreset = normalizedPresets.find((item) => item.id === storedDefaultPresetId) ?? normalizedPresets[0] ?? null;
  const legacyBacktestHistory = readBacktestRunHistory();

  const backtest = ref(null);
  const backtesting = ref(false);
  const sensitivityScan = ref(null);
  const sensitivityLoading = ref(false);
  const stabilityReport = ref(null);
  const stabilityLoading = ref(false);
  const monteCarloReport = ref(null);
  const monteCarloLoading = ref(false);
  const scenarioReport = ref(null);
  const scenarioLoading = ref(false);
  const backtestControls = ref(normalizeControls(initialPreset?.controls ?? DEFAULT_BACKTEST_CONTROLS));
  const presetName = ref("");
  const presetTag = ref("通用");
  const presetTagFilter = ref("全部");
  const customPresetTags = ref(readCustomTags());
  const savedPresets = ref(normalizedPresets);
  const backtestRunHistory = ref(legacyBacktestHistory);
  const activePresetId = ref(initialPreset?.id ?? "");
  const defaultPresetId = ref(storedDefaultPresetId);
  const backtestAssetsReady = ref(false);

  const metricCards = computed(() => {
    if (!backtest.value) {
      return [];
    }

    return [
      { label: "策略总收益", value: (backtest.value.summary.total_return * 100).toFixed(2), suffix: "%" },
      { label: "基准收益", value: (backtest.value.summary.benchmark_return * 100).toFixed(2), suffix: "%" },
      { label: "超额收益", value: (backtest.value.summary.excess_return * 100).toFixed(2), suffix: "%" },
      { label: "年化收益", value: (backtest.value.summary.annual_return * 100).toFixed(2), suffix: "%" },
      { label: "最大回撤", value: (backtest.value.summary.max_drawdown * 100).toFixed(2), suffix: "%" },
      { label: "年化波动", value: (backtest.value.summary.annual_volatility * 100).toFixed(2), suffix: "%" },
      { label: "Sharpe", value: backtest.value.summary.sharpe.toFixed(2), suffix: "" },
      { label: "Calmar", value: backtest.value.summary.calmar.toFixed(2), suffix: "" },
      { label: "Sortino", value: Number(backtest.value.summary.sortino || 0).toFixed(2), suffix: "" },
      { label: "信息比率", value: Number(backtest.value.summary.information_ratio || 0).toFixed(2), suffix: "" },
      { label: "Alpha", value: (Number(backtest.value.summary.alpha || 0) * 100).toFixed(2), suffix: "%" },
      { label: "Beta", value: Number(backtest.value.summary.beta || 0).toFixed(2), suffix: "" },
      { label: "平均换手", value: (backtest.value.summary.avg_turnover * 100).toFixed(2), suffix: "%" },
      { label: "累计成本", value: (backtest.value.summary.total_cost * 100).toFixed(2), suffix: "%" },
    ];
  });

  const latestRebalance = computed(() => backtest.value?.rebalances?.at(-1) ?? null);
  const highlightedPreset = computed(() => savedPresets.value.find((item) => item.id === activePresetId.value) ?? null);
  const defaultPreset = computed(() => savedPresets.value.find((item) => item.id === defaultPresetId.value) ?? null);
  const presetTagOptions = computed(() => {
    const fromPresets = Array.from(new Set(savedPresets.value.map((item) => normalizeTag(item.tag))));
    return [...new Set([...PRESET_TAG_OPTIONS, ...customPresetTags.value, ...fromPresets])];
  });
  const removablePresetTags = computed(() => customPresetTags.value);
  const presetFilterOptions = computed(() => {
    const fromPresets = Array.from(new Set(savedPresets.value.map((item) => normalizeTag(item.tag))));
    return ["全部", ...new Set([...presetTagOptions.value, ...fromPresets, "未分类"])];
  });
  const presetTagCountMap = computed(() => {
    const map = new Map();
    savedPresets.value.forEach((item) => {
      const tag = normalizeTag(item.tag);
      map.set(tag, (map.get(tag) ?? 0) + 1);
    });
    return map;
  });
  const presetTagColorMap = computed(() => {
    const allTags = new Set([
      ...presetTagOptions.value,
      ...presetFilterOptions.value,
      ...savedPresets.value.map((item) => normalizeTag(item.tag)),
    ]);
    const map = {};
    allTags.forEach((tag) => {
      if (tag === "全部") {
        map[tag] = "#4b5563";
        return;
      }
      map[tag] = getTagColor(tag);
    });
    return map;
  });
  const presetFilterPills = computed(() =>
    presetFilterOptions.value.map((tag) => ({
      tag,
      color: presetTagColorMap.value[tag] ?? "#4b5563",
      count: tag === "全部" ? savedPresets.value.length : presetTagCountMap.value.get(tag) ?? 0,
    })),
  );
  const filteredPresets = computed(() => {
    if (presetTagFilter.value === "全部") {
      return savedPresets.value;
    }
    return savedPresets.value.filter((item) => normalizeTag(item.tag) === presetTagFilter.value);
  });

async function migrateLegacyBacktestAssets() {
    if (!storedPresets.length && !legacyBacktestHistory.length && !customPresetTags.value.length) {
      return;
    }

    if (storedPresets.length) {
      for (const preset of storedPresets) {
        await createBacktestPreset({
          id: preset.id,
          name: preset.name,
          tag: normalizeTag(preset.tag),
          controls: normalizeControls(preset.controls),
          created_at: preset.created_at,
          last_used_at: preset.last_used_at,
        });
      }
    }

    for (const tag of customPresetTags.value) {
      if (tag && tag !== "全部" && tag !== "未分类" && !isBuiltInTag(tag)) {
        await addBacktestPresetTag(tag);
      }
    }

    if (storedDefaultPresetId) {
      await setDefaultBacktestPresetRequest(storedDefaultPresetId);
    }

    if (legacyBacktestHistory.length) {
      for (const entry of legacyBacktestHistory) {
        await createBacktestRunHistory({
          id: entry.id,
          run_at: entry.run_at,
          controls: normalizeControls(entry.controls),
          summary: {
            annual_return: Number(entry.summary?.annual_return ?? 0),
            sharpe: Number(entry.summary?.sharpe ?? 0),
            max_drawdown: Number(entry.summary?.max_drawdown ?? 0),
            total_return: Number(entry.summary?.total_return ?? 0),
          },
        });
      }
    }

    clearLegacyBacktestStorage();
  }

  async function loadBacktestAssets() {
    const presetPayload = await loadAllBacktestPresets();
    let presets = sortPresets(presetPayload.items || [], presetPayload.defaultPresetId || "");
    let history = await loadAllBacktestRunHistory();
    let nextDefaultPresetId = presetPayload.defaultPresetId || "";
    let nextCustomTags = presetPayload.customTags || [];

    if (!presets.length && !history.length && (storedPresets.length || legacyBacktestHistory.length || customPresetTags.value.length)) {
      await migrateLegacyBacktestAssets();
      const migratedPresetPayload = await loadAllBacktestPresets();
      presets = sortPresets(migratedPresetPayload.items || [], migratedPresetPayload.defaultPresetId || "");
      history = await loadAllBacktestRunHistory();
      nextDefaultPresetId = migratedPresetPayload.defaultPresetId || "";
      nextCustomTags = migratedPresetPayload.customTags || [];
    }

    savedPresets.value = presets;
    backtestRunHistory.value = history;
    defaultPresetId.value = nextDefaultPresetId;
    customPresetTags.value = nextCustomTags.filter((tag) => tag && !isBuiltInTag(tag) && tag !== "未分类");
    activePresetId.value = savedPresets.value.some((item) => item.id === activePresetId.value)
      ? activePresetId.value
      : (defaultPresetId.value || savedPresets.value[0]?.id || "");

    if (!backtestAssetsReady.value && !activePresetId.value && savedPresets.value[0]) {
      activePresetId.value = savedPresets.value[0].id;
    }

    const activePreset = savedPresets.value.find((item) => item.id === activePresetId.value)
      ?? savedPresets.value.find((item) => item.id === defaultPresetId.value)
      ?? savedPresets.value[0]
      ?? null;
    if (activePreset) {
      backtestControls.value = normalizeControls(activePreset.controls);
    }

    backtestAssetsReady.value = true;
    syncCustomTagsWithPresets();
  }

  async function reloadBacktest() {
    backtest.value = await fetchBacktest(backtestControls.value);
    return backtest.value;
  }

  async function handleBacktestRun() {
    backtesting.value = true;
    errorRef.value = "";

    try {
      const snapshot = await reloadBacktest();
      await pushBacktestRunHistory(snapshot, backtestControls.value);
      setPresetSyncMessage("回测已完成并记录到历史");
    } catch (err) {
      errorRef.value = err.message;
    } finally {
      backtesting.value = false;
    }
  }

  async function runBacktestSensitivity(scanWidth = 1) {
    sensitivityLoading.value = true;
    errorRef.value = "";
    try {
      sensitivityScan.value = await fetchBacktestSensitivity({
        ...backtestControls.value,
        scan_width: Number(scanWidth || 1),
      });
      setPresetSyncMessage("参数敏感性扫描已完成");
    } catch (err) {
      errorRef.value = err.message;
    } finally {
      sensitivityLoading.value = false;
    }
  }

  async function runBacktestStability(rollingWindow = 20) {
    stabilityLoading.value = true;
    errorRef.value = "";
    try {
      stabilityReport.value = await fetchBacktestStability({
        ...backtestControls.value,
        rolling_window: Number(rollingWindow || 20),
      });
      setPresetSyncMessage("滚动稳定性分析已完成");
    } catch (err) {
      errorRef.value = err.message;
    } finally {
      stabilityLoading.value = false;
    }
  }

  async function runBacktestMonteCarlo(trials = 300) {
    monteCarloLoading.value = true;
    errorRef.value = "";
    try {
      monteCarloReport.value = await fetchBacktestMonteCarlo({
        ...backtestControls.value,
        trials: Number(trials || 300),
      });
      setPresetSyncMessage("Monte Carlo 分析已完成");
    } catch (err) {
      errorRef.value = err.message;
    } finally {
      monteCarloLoading.value = false;
    }
  }

  async function runBacktestScenarios() {
    scenarioLoading.value = true;
    errorRef.value = "";
    try {
      scenarioReport.value = await fetchBacktestScenarios({
        ...backtestControls.value,
      });
      setPresetSyncMessage("策略情景对比已完成");
    } catch (err) {
      errorRef.value = err.message;
    } finally {
      scenarioLoading.value = false;
    }
  }

  function applyScenarioConfig(row) {
    if (!row) {
      return;
    }
    backtestControls.value = normalizeControls({
      rebalance_days: row.rebalance_days,
      top_n: row.top_n,
      trading_cost_bps: row.trading_cost_bps,
      slippage_bps: row.slippage_bps,
    });
    setPresetSyncMessage("已套用情景参数，可直接重新运行回测");
  }

  function applySensitivityConfig(point) {
    if (!point) {
      return;
    }
    backtestControls.value = normalizeControls({
      rebalance_days: point.rebalance_days,
      top_n: point.top_n,
      trading_cost_bps: point.trading_cost_bps,
      slippage_bps: point.slippage_bps,
    });
    setPresetSyncMessage("已套用扫描参数，可直接重新运行回测");
  }

  function setBacktestControls(value) {
    backtestControls.value = normalizeControls(value);
  }

  function setPresetName(value) {
    presetName.value = value;
  }

  function setPresetTag(value) {
    presetTag.value = normalizeTag(value);
  }

  function setPresetTagFilter(value) {
    presetTagFilter.value = value || "全部";
  }

  async function addCustomPresetTag(value) {
    const tag = normalizeTag(value);
    if (!tag || tag === "全部" || tag === "未分类" || isBuiltInTag(tag)) {
      setPresetSyncMessage("这个标签名不可用");
      return;
    }

    if (customPresetTags.value.includes(tag)) {
      presetTag.value = tag;
      setPresetSyncMessage("标签已存在");
      return;
    }

    await addBacktestPresetTag(tag);
    customPresetTags.value = [...customPresetTags.value, tag];
    presetTag.value = tag;
    setPresetSyncMessage("标签已新增");
  }

  async function removeCustomPresetTag(value) {
    const tag = normalizeTag(value);
    if (!tag || isBuiltInTag(tag) || tag === "未分类" || tag === "全部") {
      return;
    }

    if (!customPresetTags.value.includes(tag)) {
      setPresetSyncMessage("标签不存在");
      return;
    }

    await removeBacktestPresetTagRequest(tag);
    if (presetTag.value === tag) {
      presetTag.value = "通用";
    }
    if (presetTagFilter.value === tag) {
      presetTagFilter.value = "全部";
    }
    await loadBacktestAssets();
    setPresetSyncMessage("标签已删除，原方案已归类到“未分类”");
  }

  function setPresetSyncMessage(value) {
    if (!value) {
      return;
    }
    ElMessage({
      message: value,
      grouping: true,
      duration: 2200,
    });
  }

  function ensureDefaultPresetStillExists() {
    if (!defaultPresetId.value) {
      return;
    }

    const exists = savedPresets.value.some((item) => item.id === defaultPresetId.value);
    if (!exists) {
      defaultPresetId.value = "";
    }
  }

  function syncCustomTagsWithPresets() {
    const fromPresets = savedPresets.value
      .map((item) => normalizeTag(item.tag))
      .filter((tag) => tag && tag !== "未分类" && !isBuiltInTag(tag));

    const next = [...new Set([...customPresetTags.value, ...fromPresets])];
    customPresetTags.value = next;
  }

  async function pushBacktestRunHistory(snapshot, controls) {
    const nextEntry = {
      id: getNextPresetId(),
      run_at: new Date().toISOString(),
      controls: normalizeControls(controls),
      summary: {
        annual_return: Number(snapshot?.summary?.annual_return ?? 0),
        sharpe: Number(snapshot?.summary?.sharpe ?? 0),
        max_drawdown: Number(snapshot?.summary?.max_drawdown ?? 0),
        total_return: Number(snapshot?.summary?.total_return ?? 0),
      },
    };
    await createBacktestRunHistory(nextEntry);
    backtestRunHistory.value = await loadAllBacktestRunHistory();
  }

  function applyBacktestHistory(entryId) {
    const target = backtestRunHistory.value.find((item) => item.id === entryId);
    if (!target) {
      return;
    }

    backtestControls.value = normalizeControls(target.controls);
    setPresetSyncMessage("已套用历史参数");
  }

  async function clearBacktestRunHistory() {
    await clearBacktestRunHistoryRequest();
    backtestRunHistory.value = [];
    setPresetSyncMessage("回测历史已清空");
  }

  function exportBacktestSnapshotCsv() {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    if (!backtest.value?.equity_curve?.length) {
      setPresetSyncMessage("当前没有可导出的回测曲线");
      return;
    }

    const rows = [["trade_date", "equity", "benchmark"]];
    backtest.value.equity_curve.forEach((row) => {
      rows.push([row.trade_date, Number(row.equity ?? 0).toFixed(6), Number(row.benchmark ?? 0).toFixed(6)]);
    });

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `backtest-equity-${ts}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setPresetSyncMessage("回测曲线已导出");
  }

  function exportBacktestRunHistoryCsv() {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    if (!backtestRunHistory.value.length) {
      setPresetSyncMessage("当前没有可导出的回测历史");
      return;
    }

    const rows = [
      [
        "run_at",
        "rebalance_days",
        "top_n",
        "trading_cost_bps",
        "slippage_bps",
        "annual_return",
        "sharpe",
        "max_drawdown",
        "total_return",
      ],
    ];

    backtestRunHistory.value.forEach((row) => {
      rows.push([
        row.run_at,
        Number(row.controls?.rebalance_days ?? 0),
        Number(row.controls?.top_n ?? 0),
        Number(row.controls?.trading_cost_bps ?? 0),
        Number(row.controls?.slippage_bps ?? 0),
        Number(row.summary?.annual_return ?? 0).toFixed(6),
        Number(row.summary?.sharpe ?? 0).toFixed(6),
        Number(row.summary?.max_drawdown ?? 0).toFixed(6),
        Number(row.summary?.total_return ?? 0).toFixed(6),
      ]);
    });

    const csv = rows
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `backtest-runs-${ts}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setPresetSyncMessage("回测历史已导出");
  }

  async function saveCurrentPreset() {
    const controls = normalizeControls(backtestControls.value);
    const now = new Date().toISOString();
    const name = presetName.value.trim() || buildPresetLabel(controls);
    const created = await createBacktestPreset({
      id: getNextPresetId(),
      name,
      tag: normalizeTag(presetTag.value),
      controls,
      created_at: now,
      last_used_at: now,
    });
    activePresetId.value = created.id;
    if (!defaultPresetId.value) {
      await setDefaultBacktestPresetRequest(created.id);
    }
    await loadBacktestAssets();
    ensureDefaultPresetStillExists();
    presetName.value = "";
    setPresetSyncMessage("方案已保存");
  }

  async function applyBacktestPreset(presetId) {
    const target = savedPresets.value.find((item) => item.id === presetId);
    if (!target) {
      return;
    }

    backtestControls.value = normalizeControls(target.controls);
    activePresetId.value = target.id;
    await useBacktestPreset(presetId);
    await loadBacktestAssets();
  }

  async function deleteBacktestPreset(presetId) {
    await deleteBacktestPresetRequest(presetId);
    savedPresets.value = savedPresets.value.filter((item) => item.id !== presetId);
    if (activePresetId.value === presetId) {
      activePresetId.value = savedPresets.value[0]?.id ?? "";
    }
    if (defaultPresetId.value === presetId) {
      defaultPresetId.value = "";
    }
    await loadBacktestAssets();
    setPresetSyncMessage("方案已删除");
  }

  async function setDefaultBacktestPreset(presetId) {
    if (!savedPresets.value.some((item) => item.id === presetId)) {
      return;
    }
    await setDefaultBacktestPresetRequest(presetId);
    await loadBacktestAssets();
    setPresetSyncMessage("默认方案已更新");
  }

  async function renameBacktestPreset(payload) {
    const presetId = payload?.presetId;
    const nextName = String(payload?.name ?? "").trim();
    if (!presetId || !nextName) {
      setPresetSyncMessage("名称不能为空");
      return;
    }

    const exists = savedPresets.value.some((item) => item.id === presetId);
    if (!exists) {
      return;
    }
    await updateBacktestPreset(presetId, { name: nextName });
    await loadBacktestAssets();
    setPresetSyncMessage("方案名称已更新");
  }

  async function retagBacktestPreset(payload) {
    const presetId = payload?.presetId;
    const tag = normalizeTag(payload?.tag);
    if (!presetId) {
      return;
    }

    const exists = savedPresets.value.some((item) => item.id === presetId);
    if (!exists) {
      return;
    }
    await updateBacktestPreset(presetId, { tag });
    if (!isBuiltInTag(tag) && tag !== "未分类") {
      await addBacktestPresetTag(tag);
    }
    await loadBacktestAssets();
    setPresetSyncMessage("方案标签已更新");
  }

  async function duplicateBacktestPreset(presetId) {
    const source = savedPresets.value.find((item) => item.id === presetId);
    if (!source) {
      return;
    }

    const now = new Date().toISOString();
    const duplicated = {
      id: getNextPresetId(),
      name: getDuplicatePresetName(source.name, savedPresets.value),
      tag: normalizeTag(source.tag),
      controls: normalizeControls(source.controls),
      created_at: now,
      last_used_at: now,
    };

    await createBacktestPreset(duplicated);
    activePresetId.value = duplicated.id;
    await loadBacktestAssets();
    setPresetSyncMessage("方案已复制");
  }

  function exportBacktestPresets() {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const payload = getPresetExportPayload(savedPresets.value, defaultPresetId.value);
    const text = JSON.stringify(payload, null, 2);
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `backtest-presets-${ts}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setPresetSyncMessage("方案已导出");
  }

  async function importBacktestPresets(rawText) {
    try {
      const parsed = JSON.parse(rawText);
      const sourcePresets = Array.isArray(parsed) ? parsed : parsed?.presets;
      const sourceDefaultId = Array.isArray(parsed) ? "" : String(parsed?.default_preset_id ?? "");

      if (!Array.isArray(sourcePresets)) {
        throw new Error("导入文件格式不正确");
      }

      const now = new Date().toISOString();
      const idSet = new Set();
      const imported = sourcePresets
        .map((item, index) => {
          const baseId = String(item?.id ?? `${Date.now()}-${index}`);
          let uniqueId = baseId;
          let counter = 1;
          while (idSet.has(uniqueId)) {
            uniqueId = `${baseId}-${counter}`;
            counter += 1;
          }
          idSet.add(uniqueId);

          const controls = normalizeControls(item?.controls ?? item);
          const name = String(item?.name ?? "").trim() || buildPresetLabel(controls);
          const createdAt = item?.created_at || now;
          const lastUsedAt = item?.last_used_at || createdAt || now;

          return {
            id: uniqueId,
            name,
            tag: normalizeTag(item?.tag),
            controls,
            created_at: createdAt,
            last_used_at: lastUsedAt,
          };
        })
        .filter((item) => item.name);

      if (!imported.length) {
        throw new Error("没有可导入的方案");
      }

      for (const item of imported) {
        await createBacktestPreset(item);
      }
      if (sourceDefaultId && imported.some((item) => item.id === sourceDefaultId)) {
        await setDefaultBacktestPresetRequest(sourceDefaultId);
      }
      await loadBacktestAssets();
      setPresetSyncMessage(`已导入 ${imported.length} 个方案`);
      return true;
    } catch (error) {
      errorRef.value = error instanceof Error ? error.message : "导入失败";
      setPresetSyncMessage("导入失败，请检查 JSON 文件");
      return false;
    }
  }

  syncCustomTagsWithPresets();

  return {
    backtest,
    backtesting,
    sensitivityScan,
    sensitivityLoading,
    stabilityReport,
    stabilityLoading,
    monteCarloReport,
    monteCarloLoading,
    scenarioReport,
    scenarioLoading,
    backtestControls,
    presetName,
    presetTag,
    presetTagFilter,
    savedPresets,
    backtestRunHistory,
    filteredPresets,
    activePresetId,
    defaultPresetId,
    metricCards,
    latestRebalance,
    highlightedPreset,
    defaultPreset,
    presetTagOptions,
    removablePresetTags,
    presetFilterOptions,
    presetFilterPills,
    presetTagColorMap,
    reloadBacktest,
    handleBacktestRun,
    runBacktestSensitivity,
    runBacktestStability,
    runBacktestMonteCarlo,
    runBacktestScenarios,
    applySensitivityConfig,
    applyScenarioConfig,
    setBacktestControls,
    setPresetName,
    setPresetTag,
    setPresetTagFilter,
    addCustomPresetTag,
    removeCustomPresetTag,
    applyBacktestHistory,
    clearBacktestRunHistory,
    saveCurrentPreset,
    applyBacktestPreset,
    deleteBacktestPreset,
    setDefaultBacktestPreset,
    renameBacktestPreset,
    retagBacktestPreset,
    duplicateBacktestPreset,
    exportBacktestPresets,
    exportBacktestSnapshotCsv,
    exportBacktestRunHistoryCsv,
    importBacktestPresets,
    loadBacktestAssets,
  };
}
