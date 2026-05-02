<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { CanvasRenderer } from "echarts/renderers";
import { HeatmapChart } from "echarts/charts";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { init, use } from "echarts/core";

use([CanvasRenderer, HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent]);

const props = defineProps({
  rows: { type: Array, default: () => [] },
  metric: { type: String, default: "sharpe" },
  tradingCostBps: { type: Number, default: 0 },
  selectedKey: { type: String, default: "" },
});

const emit = defineEmits(["select"]);
const chartEl = ref(null);
let chart;
let resizeObserver;

const METRIC_META = {
  sharpe: { label: "Sharpe", scale: 1, digits: 3 },
  annual_return: { label: "年化收益(%)", scale: 100, digits: 2 },
  calmar: { label: "Calmar", scale: 1, digits: 3 },
  total_return: { label: "总收益(%)", scale: 100, digits: 2 },
  max_drawdown: { label: "最大回撤(%)", scale: 100, digits: 2 },
  sortino: { label: "Sortino", scale: 1, digits: 3 },
  information_ratio: { label: "信息比率", scale: 1, digits: 3 },
};

const metricMeta = computed(() => METRIC_META[props.metric] || METRIC_META.sharpe);

const filteredRows = computed(() =>
  (props.rows || []).filter((row) => Math.abs(Number(row.trading_cost_bps) - Number(props.tradingCostBps)) < 1e-6),
);

const xValues = computed(() =>
  Array.from(new Set(filteredRows.value.map((row) => Number(row.rebalance_days || 0))))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b),
);
const yValues = computed(() =>
  Array.from(new Set(filteredRows.value.map((row) => Number(row.top_n || 0))))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b),
);

const heatmapData = computed(() =>
  filteredRows.value.map((row) => {
    const xIndex = xValues.value.indexOf(Number(row.rebalance_days || 0));
    const yIndex = yValues.value.indexOf(Number(row.top_n || 0));
    const rawMetric = Number(row[props.metric] ?? 0);
    const value = Number.isFinite(rawMetric) ? rawMetric * metricMeta.value.scale : 0;
    const key = `${row.rebalance_days}-${row.top_n}-${row.trading_cost_bps}`;
    return {
      value: [xIndex, yIndex, value],
      point: row,
      runKey: key,
      itemStyle: key === props.selectedKey
        ? {
            borderColor: "rgba(17,24,39,0.6)",
            borderWidth: 2,
          }
        : undefined,
    };
  }),
);

const visualRange = computed(() => {
  const values = heatmapData.value.map((item) => Number(item.value?.[2] ?? 0));
  if (!values.length) {
    return { min: 0, max: 1 };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
});

const option = computed(() => ({
  animation: false,
  grid: {
    left: 64,
    right: 24,
    top: 16,
    bottom: 46,
  },
  tooltip: {
    trigger: "item",
    backgroundColor: "rgba(26, 29, 26, 0.9)",
    borderWidth: 0,
    textStyle: { color: "#fffdf7" },
    formatter(params) {
      const row = params?.data?.point;
      if (!row) {
        return "";
      }
      return [
        `<div>调仓 ${row.rebalance_days} 天 / 持仓 ${row.top_n} 只</div>`,
        `<div>成本 ${Number(row.trading_cost_bps).toFixed(2)} bps</div>`,
        `<div>${metricMeta.value.label}: ${(Number(row[props.metric] ?? 0) * metricMeta.value.scale).toFixed(metricMeta.value.digits)}</div>`,
        `<div>年化: ${(Number(row.annual_return ?? 0) * 100).toFixed(2)}%</div>`,
        `<div>Sharpe: ${Number(row.sharpe ?? 0).toFixed(3)}</div>`,
        `<div>回撤: ${(Number(row.max_drawdown ?? 0) * 100).toFixed(2)}%</div>`,
      ].join("");
    },
  },
  visualMap: {
    type: "continuous",
    min: visualRange.value.min,
    max: visualRange.value.max,
    orient: "horizontal",
    left: "center",
    bottom: 6,
    calculable: false,
    text: ["高", "低"],
    textStyle: { color: "#5d655f" },
    inRange: {
      color: ["#f3f1d8", "#eab63f", "#2f7d57"],
    },
  },
  xAxis: {
    type: "category",
    data: xValues.value.map((value) => `${value}`),
    name: "调仓天数",
    nameTextStyle: { color: "#5d655f", padding: [0, 0, 0, 4] },
    axisLabel: { color: "#5d655f" },
    splitArea: { show: true, areaStyle: { color: ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.08)"] } },
  },
  yAxis: {
    type: "category",
    data: yValues.value.map((value) => `${value}`),
    name: "持仓数量",
    nameTextStyle: { color: "#5d655f", padding: [0, 0, 0, 6] },
    axisLabel: { color: "#5d655f" },
    splitArea: { show: true, areaStyle: { color: ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.08)"] } },
  },
  series: [
    {
      type: "heatmap",
      data: heatmapData.value,
      label: {
        show: true,
        color: "#1f2937",
        formatter(params) {
          return Number(params?.value?.[2] ?? 0).toFixed(metricMeta.value.digits);
        },
      },
      emphasis: {
        itemStyle: {
          borderColor: "rgba(17,24,39,0.72)",
          borderWidth: 2,
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
    const point = params?.data?.point;
    if (point) {
      emit("select", point);
    }
  });
}

onMounted(() => {
  renderChart();
  resizeObserver = new ResizeObserver(() => chart?.resize());
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
  <div ref="chartEl" class="echart-shell sensitivity-echart" />
</template>
