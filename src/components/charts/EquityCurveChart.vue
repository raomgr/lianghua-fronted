<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { graphic, init, use } from "echarts/core";

use([CanvasRenderer, LineChart, GridComponent, LegendComponent, TooltipComponent]);

const props = defineProps({
  equityCurve: { type: Array, default: () => [] },
});

const chartEl = ref(null);
let chart;
let resizeObserver;

const option = computed(() => ({
  animation: false,
  grid: { left: 24, right: 24, top: 28, bottom: 28 },
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(26, 29, 26, 0.88)",
    borderWidth: 0,
    textStyle: { color: "#fffdf7" },
  },
  legend: {
    top: 0,
    textStyle: { color: "#5d655f" },
  },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: props.equityCurve.map((point) => point.trade_date),
    axisLabel: { color: "#5d655f", hideOverlap: true },
    axisLine: { lineStyle: { color: "rgba(32, 43, 35, 0.12)" } },
  },
  yAxis: {
    type: "value",
    scale: true,
    axisLabel: { color: "#5d655f" },
    splitLine: { lineStyle: { color: "rgba(32, 43, 35, 0.08)" } },
  },
  series: [
    {
      name: "策略",
      type: "line",
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 3, color: "#166534" },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(22, 101, 52, 0.28)" },
          { offset: 1, color: "rgba(22, 101, 52, 0.04)" },
        ]),
      },
      data: props.equityCurve.map((point) => point.equity),
    },
    {
      name: "基准",
      type: "line",
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: "#b45309" },
      data: props.equityCurve.map((point) => point.benchmark),
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
  <div ref="chartEl" class="echart-shell equity-echart" />
</template>
