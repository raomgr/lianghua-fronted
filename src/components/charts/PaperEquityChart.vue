<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { init, use } from "echarts/core";

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);

const props = defineProps({
  points: { type: Array, default: () => [] },
});

const chartEl = ref(null);
let chart;
let resizeObserver;

const xAxisData = computed(() => (props.points || []).map((row) => row.snapshot_at));
const equityData = computed(() => (props.points || []).map((row) => Number(row.equity || 0)));
const cashData = computed(() => (props.points || []).map((row) => Number(row.cash || 0)));

const option = computed(() => ({
  animation: false,
  grid: { left: 48, right: 18, top: 18, bottom: 28 },
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
    axisLabel: { color: "#5d655f" },
    splitLine: { lineStyle: { color: "rgba(32, 43, 35, 0.08)" } },
  },
  series: [
    {
      name: "权益",
      type: "line",
      smooth: true,
      symbol: "none",
      data: equityData.value,
      lineStyle: { width: 2, color: "#2f7d57" },
      areaStyle: { color: "rgba(47, 125, 87, 0.14)" },
    },
    {
      name: "现金",
      type: "line",
      smooth: true,
      symbol: "none",
      data: cashData.value,
      lineStyle: { width: 1.6, color: "#c2842f" },
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
  <div ref="chartEl" class="echart-shell paper-equity-echart" />
</template>
