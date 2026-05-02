<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart, CandlestickChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { graphic, init, use } from "echarts/core";

use([CanvasRenderer, BarChart, CandlestickChart, LineChart, GridComponent, LegendComponent, TooltipComponent]);

const props = defineProps({
  history: { type: Array, default: () => [] },
  mode: { type: String, default: "line" },
  indicator: { type: String, default: "none" },
});

const chartEl = ref(null);
let chart;
let resizeObserver;

function formatVolume(value) {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
  return `${Number(value ?? 0).toFixed(0)}`;
}

function formatAmount(value) {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿元`;
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万元`;
  return `${Number(value ?? 0).toFixed(0)}元`;
}

function buildMovingAverage(days) {
  return props.history.map((_, index) => {
    if (index < days - 1) {
      return null;
    }
    const window = props.history.slice(index - days + 1, index + 1);
    const total = window.reduce((sum, item) => sum + item.close, 0);
    return Number((total / days).toFixed(2));
  });
}

function buildBollSeries(period = 20, multiplier = 2) {
  return props.history.map((_, index) => {
    if (index < period - 1) {
      return { mid: null, upper: null, lower: null };
    }
    const window = props.history.slice(index - period + 1, index + 1);
    const closes = window.map((item) => item.close);
    const mean = closes.reduce((sum, value) => sum + value, 0) / period;
    const variance = closes.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / period;
    const std = Math.sqrt(variance);
    return {
      mid: Number(mean.toFixed(2)),
      upper: Number((mean + (std * multiplier)).toFixed(2)),
      lower: Number((mean - (std * multiplier)).toFixed(2)),
    };
  });
}

function buildEmaSeries(period) {
  let ema;
  return props.history.map((item, index) => {
    if (index === 0) {
      ema = item.close;
      return Number(ema.toFixed(2));
    }
    const multiplier = 2 / (period + 1);
    ema = (item.close - ema) * multiplier + ema;
    return Number(ema.toFixed(2));
  });
}

function buildMacdSeries() {
  const ema12 = buildEmaSeries(12);
  const ema26 = buildEmaSeries(26);
  const dif = ema12.map((value, index) => Number((value - ema26[index]).toFixed(2)));
  let deaPrev = 0;
  const dea = dif.map((value, index) => {
    if (index === 0) {
      deaPrev = value;
      return Number(value.toFixed(2));
    }
    deaPrev = deaPrev * 0.8 + value * 0.2;
    return Number(deaPrev.toFixed(2));
  });
  const macd = dif.map((value, index) => Number(((value - dea[index]) * 2).toFixed(2)));
  return { dif, dea, macd };
}

function buildRsiSeries(period) {
  const rsi = [];
  let avgGain = 0;
  let avgLoss = 0;

  props.history.forEach((item, index) => {
    if (index === 0) {
      rsi.push(null);
      return;
    }
    const change = item.close - props.history[index - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (index <= period) {
      avgGain += gain;
      avgLoss += loss;
      rsi.push(index === period
        ? Number((100 - 100 / (1 + (avgLoss === 0 ? 100 : (avgGain / period) / (avgLoss / period)))).toFixed(2))
        : null);
      if (index === period) {
        avgGain /= period;
        avgLoss /= period;
      }
      return;
    }

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(Number((100 - 100 / (1 + rs)).toFixed(2)));
  });

  return rsi;
}

const option = computed(() => {
  const dates = props.history.map((item) => item.trade_date);
  const closeSeries = props.history.map((item) => item.close);
  const candleSeries = props.history.map((item) => [item.open, item.close, item.low, item.high]);
  const ma5 = buildMovingAverage(5);
  const ma20 = buildMovingAverage(20);
  const ma60 = buildMovingAverage(60);
  const bollSeries = buildBollSeries();
  const macdSeries = buildMacdSeries();
  const rsiSeries = buildRsiSeries(14);
  const volumeSeries = props.history.map((item) => ({
    value: item.volume,
    itemStyle: {
      color: item.close >= item.open ? "rgba(22, 101, 52, 0.72)" : "rgba(180, 35, 24, 0.68)",
    },
  }));

  const priceSeries = props.mode === "candle"
    ? [
        {
          name: "日K",
          type: "candlestick",
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: candleSeries,
          itemStyle: {
            color: "#166534",
            color0: "#b42318",
            borderColor: "#166534",
            borderColor0: "#b42318",
          },
        },
      ]
    : [
        {
          name: "收盘价",
          type: "line",
          smooth: true,
          showSymbol: false,
          xAxisIndex: 0,
          yAxisIndex: 0,
          lineStyle: { width: 3, color: "#166534" },
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(22, 101, 52, 0.24)" },
              { offset: 1, color: "rgba(22, 101, 52, 0.03)" },
            ]),
          },
          data: closeSeries,
        },
      ];
  const hasSecondaryIndicator = props.indicator === "macd" || props.indicator === "rsi";
  const hasBollOverlay = props.indicator === "boll";

  return {
    animation: false,
    grid: hasSecondaryIndicator
      ? [
          { left: 16, right: 16, top: 44, height: 210 },
          { left: 16, right: 16, top: 274, height: 62 },
          { left: 16, right: 16, top: 350, height: 62 },
        ]
      : [
          { left: 16, right: 16, top: 44, height: 220 },
          { left: 16, right: 16, top: 284, height: 78 },
        ],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      backgroundColor: "rgba(26, 29, 26, 0.88)",
      borderWidth: 0,
      textStyle: { color: "#fffdf7" },
      formatter: (params) => {
        const dataIndex = params?.[0]?.dataIndex ?? 0;
        const row = props.history[dataIndex];
        if (!row) {
          return "";
        }

        const changePct = row.open ? ((row.close - row.open) / row.open) * 100 : 0;
        const amplitudePct = row.low ? ((row.high - row.low) / row.low) * 100 : 0;
        const color = row.close >= row.open ? "#7ee787" : "#ff9b9b";

        return [
          `<div style="min-width: 196px;">`,
          `<div style="font-weight:700;margin-bottom:8px;">${row.trade_date}</div>`,
          `<div>开盘 <span style="float:right;color:${color};">${row.open.toFixed(2)}</span></div>`,
          `<div>最高 <span style="float:right;color:${color};">${row.high.toFixed(2)}</span></div>`,
          `<div>最低 <span style="float:right;color:${color};">${row.low.toFixed(2)}</span></div>`,
          `<div>收盘 <span style="float:right;color:${color};">${row.close.toFixed(2)}</span></div>`,
          `<div>涨跌 <span style="float:right;color:${color};">${changePct.toFixed(2)}%</span></div>`,
          `<div>振幅 <span style="float:right;">${amplitudePct.toFixed(2)}%</span></div>`,
          `<div>成交量 <span style="float:right;">${formatVolume(row.volume)}</span></div>`,
          `<div>成交额 <span style="float:right;">${formatAmount(row.amount ?? 0)}</span></div>`,
          hasBollOverlay
            ? `<div>BOLL上轨 <span style="float:right;">${bollSeries[dataIndex]?.upper ?? "-"}</span></div>
               <div>BOLL中轨 <span style="float:right;">${bollSeries[dataIndex]?.mid ?? "-"}</span></div>
               <div>BOLL下轨 <span style="float:right;">${bollSeries[dataIndex]?.lower ?? "-"}</span></div>`
            : "",
          props.indicator === "macd"
            ? `<div>MACD <span style="float:right;">${macdSeries.macd[dataIndex] ?? "-"}</span></div>`
            : "",
          props.indicator === "rsi"
            ? `<div>RSI14 <span style="float:right;">${rsiSeries[dataIndex] ?? "-"}</span></div>`
            : "",
          `</div>`,
        ].join("");
      },
    },
    legend: {
      top: 0,
      left: 12,
      textStyle: { color: "#5d655f" },
      itemWidth: 12,
      itemHeight: 8,
    },
    xAxis: [
      {
        type: "category",
        data: dates,
        boundaryGap: props.mode === "candle",
        axisLabel: { show: false },
        axisLine: { lineStyle: { color: "rgba(32, 43, 35, 0.12)" } },
        axisTick: { show: false },
      },
      {
        type: "category",
        gridIndex: 1,
        data: dates,
        boundaryGap: true,
        axisLabel: { show: false },
        axisLine: { lineStyle: { color: "rgba(32, 43, 35, 0.12)" } },
        axisTick: { show: false },
      },
      ...(hasSecondaryIndicator
        ? [
            {
              type: "category",
              gridIndex: 2,
              data: dates,
              boundaryGap: true,
              axisLabel: { color: "#5d655f", hideOverlap: true },
              axisLine: { lineStyle: { color: "rgba(32, 43, 35, 0.12)" } },
              axisTick: { show: false },
            },
          ]
        : []),
    ],
    yAxis: [
      {
        type: "value",
        scale: true,
        axisLabel: { color: "#5d655f" },
        splitLine: { lineStyle: { color: "rgba(32, 43, 35, 0.08)" } },
      },
      {
        type: "value",
        gridIndex: 1,
        axisLabel: {
          color: "#5d655f",
          formatter: (value) => {
            if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`;
            if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
            return `${value}`;
          },
        },
        splitLine: { show: false },
      },
      ...(hasSecondaryIndicator
        ? [
            {
              type: "value",
              gridIndex: 2,
              axisLabel: { color: "#5d655f" },
              splitLine: { lineStyle: { color: "rgba(32, 43, 35, 0.05)" } },
              min: props.indicator === "rsi" ? 0 : null,
              max: props.indicator === "rsi" ? 100 : null,
            },
          ]
        : []),
    ],
    series: [
      ...priceSeries,
      {
        name: "MA5",
        type: "line",
        showSymbol: false,
        smooth: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        lineStyle: { width: 1.8, color: "#b45309" },
        data: ma5,
      },
      {
        name: "MA20",
        type: "line",
        showSymbol: false,
        smooth: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        lineStyle: { width: 1.8, color: "#2563eb" },
        data: ma20,
      },
      {
        name: "MA60",
        type: "line",
        showSymbol: false,
        smooth: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        lineStyle: { width: 1.8, color: "#7c3aed" },
        data: ma60,
      },
      ...(hasBollOverlay
        ? [
            {
              name: "BOLL上轨",
              type: "line",
              showSymbol: false,
              smooth: true,
              xAxisIndex: 0,
              yAxisIndex: 0,
              lineStyle: { width: 1.5, color: "#dc2626", type: "dashed" },
              data: bollSeries.map((item) => item.upper),
            },
            {
              name: "BOLL中轨",
              type: "line",
              showSymbol: false,
              smooth: true,
              xAxisIndex: 0,
              yAxisIndex: 0,
              lineStyle: { width: 1.5, color: "#2563eb", type: "dashed" },
              data: bollSeries.map((item) => item.mid),
            },
            {
              name: "BOLL下轨",
              type: "line",
              showSymbol: false,
              smooth: true,
              xAxisIndex: 0,
              yAxisIndex: 0,
              lineStyle: { width: 1.5, color: "#16a34a", type: "dashed" },
              data: bollSeries.map((item) => item.lower),
            },
          ]
        : []),
      {
        name: "成交量",
        type: "bar",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumeSeries,
        barMaxWidth: 10,
      },
      ...(props.indicator === "macd"
        ? [
            {
              name: "MACD",
              type: "bar",
              xAxisIndex: 2,
              yAxisIndex: 2,
              data: macdSeries.macd.map((value) => ({
                value,
                itemStyle: {
                  color: value >= 0 ? "rgba(22, 101, 52, 0.68)" : "rgba(180, 35, 24, 0.68)",
                },
              })),
              barMaxWidth: 10,
            },
            {
              name: "DIF",
              type: "line",
              showSymbol: false,
              xAxisIndex: 2,
              yAxisIndex: 2,
              lineStyle: { width: 1.8, color: "#2563eb" },
              data: macdSeries.dif,
            },
            {
              name: "DEA",
              type: "line",
              showSymbol: false,
              xAxisIndex: 2,
              yAxisIndex: 2,
              lineStyle: { width: 1.8, color: "#b45309" },
              data: macdSeries.dea,
            },
          ]
        : []),
      ...(props.indicator === "rsi"
        ? [
            {
              name: "RSI14",
              type: "line",
              showSymbol: false,
              xAxisIndex: 2,
              yAxisIndex: 2,
              lineStyle: { width: 2, color: "#7c3aed" },
              data: rsiSeries,
              markLine: {
                symbol: "none",
                lineStyle: {
                  color: "rgba(32, 43, 35, 0.28)",
                  type: "dashed",
                },
                label: { show: false },
                data: [{ yAxis: 30 }, { yAxis: 70 }],
              },
            },
          ]
        : []),
    ],
  };
});

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
  <div ref="chartEl" class="echart-shell price-echart" />
</template>
