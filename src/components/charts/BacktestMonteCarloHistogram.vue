<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { init, use } from "echarts/core";

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);

const props = defineProps({
  bins: { type: Array, default: () => [] },
  title: { type: String, default: "分布" },
});

const chartEl = ref(null);
let chart;
let resizeObserver;

const xAxisData = computed(() =>
  (props.bins || []).map((item) => `${Number(item.left).toFixed(1)} ~ ${Number(item.right).toFixed(1)}`),
);
const seriesData = computed(() => (props.bins || []).map((item) => Number(item.count || 0)));

const option = computed(() => ({
  animation: false,
  grid: { left: 40, right: 16, top: 18, bottom: 54 },
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(26, 29, 26, 0.88)",
    borderWidth: 0,
    textStyle: { color: "#fffdf7" },
  },
  xAxis: {
    type: "category",
    data: xAxisData.value,
    axisLabel: { color: "#5d655f", rotate: 35, fontSize: 10 },
    axisLine: { lineStyle: { color: "rgba(32, 43, 35, 0.15)" } },
  },
  yAxis: {
    type: "value",
    name: props.title,
    nameTextStyle: { color: "#5d655f" },
    axisLabel: { color: "#5d655f" },
    splitLine: { lineStyle: { color: "rgba(32, 43, 35, 0.08)" } },
  },
  series: [
    {
      type: "bar",
      data: seriesData.value,
      barWidth: "72%",
      itemStyle: {
        color: "#2f7d57",
        borderRadius: [4, 4, 0, 0],
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
  <div ref="chartEl" class="echart-shell montecarlo-echart" />
</template>
