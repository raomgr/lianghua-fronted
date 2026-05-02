<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart, ScatterChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { init, use } from "echarts/core";

use([CanvasRenderer, ScatterChart, LineChart, GridComponent, TooltipComponent]);

const props = defineProps({
  runs: { type: Array, default: () => [] },
  xMetric: { type: String, default: "annual_return" },
  yMetric: { type: String, default: "sharpe" },
  sizeMetric: { type: String, default: "total_return" },
  selectedId: { type: String, default: "" },
});
const emit = defineEmits(["select"]);

const chartEl = ref(null);
let chart;
let resizeObserver;

const METRIC_META = {
  annual_return: { label: "年化(%)", scale: 100, digits: 2, better: "max" },
  sharpe: { label: "Sharpe", scale: 1, digits: 2, better: "max" },
  max_drawdown: { label: "最大回撤(%)", scale: 100, digits: 2, better: "min" },
  total_return: { label: "总收益(%)", scale: 100, digits: 2, better: "max" },
};

const selectedMeta = computed(() => ({
  x: METRIC_META[props.xMetric] || METRIC_META.annual_return,
  y: METRIC_META[props.yMetric] || METRIC_META.sharpe,
  size: METRIC_META[props.sizeMetric] || METRIC_META.total_return,
}));

const points = computed(() =>
  (props.runs || []).map((item) => {
    const annualReturn = Number(item?.summary?.annual_return ?? 0) * 100;
    const sharpe = Number(item?.summary?.sharpe ?? 0);
    const drawdown = Number(item?.summary?.max_drawdown ?? 0) * 100;
    const totalReturn = Number(item?.summary?.total_return ?? 0) * 100;
    const metrics = {
      annual_return: annualReturn,
      sharpe,
      max_drawdown: drawdown,
      total_return: totalReturn,
    };
    const controls = item?.controls || {};
    return {
      id: String(item?.id ?? ""),
      metrics,
      meta: {
        runAt: item?.run_at ?? "",
        controlsLabel: `${controls.rebalance_days ?? "-"}天 / ${controls.top_n ?? "-"}股 / ${controls.trading_cost_bps ?? "-"}-${controls.slippage_bps ?? "-"}`,
      },
    };
  }),
);

const pointMap = computed(() => new Map(points.value.map((item) => [item.id, item])));

function optimizeValue(metric, value) {
  const meta = METRIC_META[metric] || METRIC_META.annual_return;
  const number = Number(value ?? 0);
  return meta.better === "min" ? -number : number;
}

function isDominated(candidates, index) {
  const target = candidates[index];
  return candidates.some((item, itemIndex) => {
    if (itemIndex === index) {
      return false;
    }
    const noWorseX = item.xOpt >= target.xOpt;
    const noWorseY = item.yOpt >= target.yOpt;
    const strictlyBetter = item.xOpt > target.xOpt || item.yOpt > target.yOpt;
    return noWorseX && noWorseY && strictlyBetter;
  });
}

const frontierPoints = computed(() => {
  const candidates = points.value
    .map((item) => {
      const x = Number(item.metrics[props.xMetric] ?? 0);
      const y = Number(item.metrics[props.yMetric] ?? 0);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }
      return {
        item,
        x,
        y,
        xOpt: optimizeValue(props.xMetric, x),
        yOpt: optimizeValue(props.yMetric, y),
      };
    })
    .filter(Boolean);

  return candidates
    .filter((_, index) => !isDominated(candidates, index))
    .sort((a, b) => a.x - b.x)
    .map((entry) => entry.item);
});

const frontierIdSet = computed(() => new Set(frontierPoints.value.map((item) => item.id)));

const scatterSeriesData = computed(() =>
  points.value.map((item) => {
    const sharpe = Number(item.metrics.sharpe ?? 0);
    let color = "#b23a48";
    if (sharpe >= 1.2) {
      color = "#166534";
    } else if (sharpe >= 0.6) {
      color = "#2f7d57";
    } else if (sharpe >= 0) {
      color = "#b45309";
    }

    const isSelected = item.id && item.id === props.selectedId;
    return {
      runId: item.id,
      value: [
        Number(item.metrics[props.xMetric] ?? 0),
        Number(item.metrics[props.yMetric] ?? 0),
        Number(item.metrics[props.sizeMetric] ?? 0),
      ],
      itemStyle: {
        color,
        opacity: isSelected ? 1 : 0.88,
        borderWidth: isSelected ? 2 : 0.5,
        borderColor: isSelected ? "rgba(17, 24, 39, 0.52)" : "rgba(17, 24, 39, 0.18)",
      },
    };
  }),
);

const frontierSeriesData = computed(() =>
  frontierPoints.value.map((item) => {
    const isSelected = item.id && item.id === props.selectedId;
    return {
      runId: item.id,
      value: [
        Number(item.metrics[props.xMetric] ?? 0),
        Number(item.metrics[props.yMetric] ?? 0),
        Number(item.metrics[props.sizeMetric] ?? 0),
      ],
      itemStyle: {
        color: "#f59e0b",
        opacity: 0.98,
        borderColor: isSelected ? "rgba(17, 24, 39, 0.58)" : "rgba(17, 24, 39, 0.34)",
        borderWidth: isSelected ? 2.2 : 1.4,
      },
    };
  }),
);

const option = computed(() => ({
  animation: false,
  grid: { left: 38, right: 22, top: 18, bottom: 28 },
  tooltip: {
    trigger: "item",
    backgroundColor: "rgba(26, 29, 26, 0.88)",
    borderWidth: 0,
    textStyle: { color: "#fffdf7" },
    formatter(params) {
      const runId = String(params?.data?.runId ?? "");
      const run = runId ? pointMap.value.get(runId) : null;
      if (!run) {
        return "";
      }
      const annualReturn = run.metrics.annual_return;
      const sharpe = run.metrics.sharpe;
      const drawdown = run.metrics.max_drawdown;
      const totalReturn = run.metrics.total_return;
      return [
        `<div>${run.meta.runAt}</div>`,
        `<div>${run.meta.controlsLabel}</div>`,
        frontierIdSet.value.has(run.id) ? "<div>Pareto 前沿</div>" : "",
        `<div>年化: ${annualReturn.toFixed(2)}%</div>`,
        `<div>Sharpe: ${sharpe.toFixed(2)}</div>`,
        `<div>最大回撤: ${drawdown.toFixed(2)}%</div>`,
        `<div>总收益: ${totalReturn.toFixed(2)}%</div>`,
      ].join("");
    },
  },
  xAxis: {
    type: "value",
    name: selectedMeta.value.x.label,
    nameTextStyle: { color: "#5d655f", padding: [0, 0, 0, 8] },
    axisLabel: { color: "#5d655f" },
    splitLine: { lineStyle: { color: "rgba(32, 43, 35, 0.08)" } },
  },
  yAxis: {
    type: "value",
    name: selectedMeta.value.y.label,
    nameTextStyle: { color: "#5d655f", padding: [0, 0, 0, 8] },
    axisLabel: { color: "#5d655f" },
    splitLine: { lineStyle: { color: "rgba(32, 43, 35, 0.08)" } },
  },
  series: [
    {
      name: "runs",
      type: "scatter",
      data: scatterSeriesData.value,
      symbolSize(value) {
        const scaled = Math.abs(Number(value[2] ?? 0));
        return Math.min(28, Math.max(10, 10 + scaled * 0.32));
      },
      emphasis: {
        itemStyle: {
          borderWidth: 1.5,
          borderColor: "rgba(17, 24, 39, 0.26)",
        },
      },
    },
    {
      name: "frontier-line",
      type: "line",
      data: frontierSeriesData.value.map((item) => ({
        runId: item.runId,
        value: [item.value[0], item.value[1]],
      })),
      symbol: "none",
      connectNulls: false,
      lineStyle: {
        color: "rgba(245, 158, 11, 0.75)",
        width: 1.2,
        type: "dashed",
      },
      z: 3,
      silent: true,
    },
    {
      name: "frontier",
      type: "scatter",
      data: frontierSeriesData.value,
      symbol: "diamond",
      symbolSize(value, params) {
        const isSelected = String(params?.data?.runId || "") === props.selectedId;
        const scaled = Math.abs(Number(value?.[2] ?? 0));
        const base = Math.min(30, Math.max(12, 12 + scaled * 0.28));
        return isSelected ? base + 3 : base;
      },
      z: 4,
      emphasis: {
        itemStyle: {
          borderWidth: 2.2,
          borderColor: "rgba(17, 24, 39, 0.58)",
        },
      },
    },
  ],
}));

function renderChart() {
  if (!chartEl.value) {
    return;
  }
  if (!chart) {
    chart = init(chartEl.value);
  }
  chart.setOption(option.value, true);
  chart.off("click");
  chart.on("click", (params) => {
    const runId = String(params?.data?.runId ?? "");
    if (runId) {
      emit("select", runId);
    }
  });
}

onMounted(() => {
  renderChart();
  resizeObserver = new ResizeObserver(() => {
    chart?.resize();
  });
  if (chartEl.value) {
    resizeObserver.observe(chartEl.value);
  }
});

watch(option, () => {
  renderChart();
}, { deep: true });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = undefined;
});
</script>

<template>
  <div ref="chartEl" class="echart-shell backtest-history-echart" />
</template>
