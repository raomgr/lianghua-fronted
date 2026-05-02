<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { CanvasRenderer } from "echarts/renderers";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { LineChart } from "echarts/charts";
import { init, use } from "echarts/core";

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

const props = defineProps({
  points: { type: Array, default: () => [] },
  metric: { type: String, default: "rolling_sharpe" },
});

const chartEl = ref(null);
let chart;
let resizeObserver;

const METRIC_META = {
  rolling_sharpe: { label: "Rolling Sharpe", scale: 1, digits: 3 },
  rolling_volatility: { label: "Rolling Vol(%)", scale: 100, digits: 2 },
  rolling_excess_return: { label: "Rolling Excess(%)", scale: 100, digits: 2 },
  rolling_max_drawdown: { label: "Rolling MaxDD(%)", scale: 100, digits: 2 },
};

const metricMeta = computed(() => METRIC_META[props.metric] || METRIC_META.rolling_sharpe);
const xAxisData = computed(() => (props.points || []).map((row) => row.trade_date));

const seriesData = computed(() =>
  (props.points || []).map((row) => Number(row[props.metric] ?? 0) * metricMeta.value.scale),
);

const option = computed(() => ({
  animation: false,
  grid: { left: 44, right: 18, top: 18, bottom: 30 },
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(26, 29, 26, 0.88)",
    borderWidth: 0,
    textStyle: { color: "#fffdf7" },
  },
  xAxis: {
    type: "category",
    data: xAxisData.value,
    axisLabel: { color: "#5d655f", hideOverlap: true },
    axisLine: { lineStyle: { color: "rgba(32, 43, 35, 0.15)" } },
  },
  yAxis: {
    type: "value",
    name: metricMeta.value.label,
    nameTextStyle: { color: "#5d655f" },
    axisLabel: {
      color: "#5d655f",
      formatter(value) {
        return Number(value).toFixed(metricMeta.value.digits);
      },
    },
    splitLine: { lineStyle: { color: "rgba(32, 43, 35, 0.08)" } },
  },
  series: [
    {
      type: "line",
      smooth: true,
      symbol: "none",
      data: seriesData.value,
      lineStyle: { width: 2, color: "#2f7d57" },
      areaStyle: { color: "rgba(47, 125, 87, 0.16)" },
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
  <div ref="chartEl" class="echart-shell stability-echart" />
</template>
