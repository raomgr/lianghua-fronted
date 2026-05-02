<script setup>
import { computed, defineAsyncComponent } from "vue";

const PriceHistoryChart = defineAsyncComponent(() => import("../charts/PriceHistoryChart.vue"));

const props = defineProps({
  selectedStock: { type: Object, default: null },
  visibleHistory: { type: Array, default: () => [] },
  selectedHistoryStats: { type: Object, default: null },
  selectedFactorCards: { type: Array, default: () => [] },
  selectedHistoryRange: { type: String, default: "3m" },
  selectedChartMode: { type: String, default: "candle" },
  selectedIndicator: { type: String, default: "none" },
  historyRangeOptions: { type: Array, default: () => [] },
  chartModeOptions: { type: Array, default: () => [] },
  indicatorOptions: { type: Array, default: () => [] },
  topPrediction: { type: Object, default: null },
  predictions: { type: Array, default: () => [] },
  latestRebalance: { type: Object, default: null },
  rebalances: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:selectedHistoryRange", "update:selectedChartMode", "update:selectedIndicator"]);

const chartStart = computed(() => props.visibleHistory[0]?.trade_date ?? "");
const chartEnd = computed(() => props.visibleHistory.at(-1)?.trade_date ?? "");
</script>

<template>
  <section class="panel section-panel">
    <div class="table-header">
      <div class="section-title">个股研究</div>
    </div>

    <section class="panel detail-panel inner-panel">
      <div class="detail-header">
        <div>
          <h2 v-if="selectedStock" class="detail-title">
            {{ selectedStock.name }} <span>{{ selectedStock.symbol }}</span>
          </h2>
        </div>
        <div class="detail-toolbar">
          <div v-if="selectedStock" class="toolbar-switches">
            <div class="range-switch">
              <button
                v-for="option in historyRangeOptions"
                :key="option.key"
                class="range-chip"
                :class="{ active: selectedHistoryRange === option.key }"
                @click="emit('update:selectedHistoryRange', option.key)"
              >
                {{ option.label }}
              </button>
            </div>
            <div class="range-switch mode-switch">
              <button
                v-for="option in chartModeOptions"
                :key="option.key"
                class="range-chip"
                :class="{ active: selectedChartMode === option.key }"
                @click="emit('update:selectedChartMode', option.key)"
              >
                {{ option.label }}
              </button>
            </div>
            <div class="range-switch mode-switch">
              <button
                v-for="option in indicatorOptions"
                :key="option.key"
                class="range-chip"
                :class="{ active: selectedIndicator === option.key }"
                @click="emit('update:selectedIndicator', option.key)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <div v-if="selectedStock" class="detail-badge" :class="selectedStock.pct_change >= 0 ? 'positive-fill' : 'negative-fill'">
            {{ selectedStock.pct_change.toFixed(2) }}%
          </div>
        </div>
      </div>

      <template v-if="selectedHistoryStats">
        <div class="detail-metrics">
          <div>
            <span>最新收盘</span>
            <strong>{{ selectedHistoryStats.latestClose.toFixed(2) }}</strong>
          </div>
          <div>
            <span>区间最高</span>
            <strong>{{ selectedHistoryStats.periodHigh.toFixed(2) }}</strong>
          </div>
          <div>
            <span>区间最低</span>
            <strong>{{ selectedHistoryStats.periodLow.toFixed(2) }}</strong>
          </div>
          <div>
            <span>区间收益</span>
            <strong>{{ selectedHistoryStats.periodReturn.toFixed(2) }}%</strong>
          </div>
        </div>

        <div class="price-chart-shell">
          <PriceHistoryChart :history="visibleHistory" :mode="selectedChartMode" :indicator="selectedIndicator" />
          <div class="chart-footer">
            <span>{{ chartStart }}</span>
            <span>{{ chartEnd }}</span>
          </div>
        </div>

        <div v-if="selectedFactorCards.length" class="factor-card-grid">
          <div v-for="card in selectedFactorCards" :key="card.label" class="factor-card">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </div>
        </div>
      </template>
      <p v-else>暂无个股历史数据。</p>
    </section>

    <div class="research-grid">
      <section class="panel compact-panel history-panel equal-card equal-card-large">
        <div class="section-title">模型优选</div>
        <div v-if="topPrediction" class="model-highlight">
          <div class="model-highlight-symbol">{{ topPrediction.symbol }}</div>
          <div class="model-highlight-score">预测 5 日收益 {{ (topPrediction.predicted_return_5d * 100).toFixed(2) }}%</div>
          <p>模型：{{ topPrediction.model_name }}</p>
          <p>运行时间：{{ topPrediction.run_at }}</p>
        </div>
        <div class="card-scroll">
          <div class="history-list">
            <div v-for="row in predictions" :key="`${row.run_at}-${row.symbol}`" class="history-row">
              <span>#{{ row.rank }} {{ row.symbol }}</span>
              <strong>{{ (row.predicted_return_5d * 100).toFixed(2) }}%</strong>
              <span>{{ row.name }}</span>
            </div>
          </div>
        </div>
      </section>

      <div class="stacked-grid">
        <section class="panel compact-panel equal-card equal-card-half">
          <div class="section-title">最新持仓</div>
          <div v-if="latestRebalance?.holdings?.length" class="card-scroll">
            <div class="history-list">
              <div v-for="holding in latestRebalance.holdings" :key="holding.symbol" class="history-row">
                <span>{{ holding.symbol }}</span>
                <strong>{{ holding.name }}</strong>
                <span>Score {{ holding.score.toFixed(3) }}</span>
              </div>
            </div>
          </div>
          <p v-else>暂无调仓记录。</p>
        </section>

        <section class="panel compact-panel equal-card equal-card-half">
          <div class="section-title">最近调仓</div>
          <div class="card-scroll">
            <div class="history-list">
              <div v-for="row in rebalances" :key="row.trade_date" class="history-row model-run-row">
                <span>{{ row.trade_date }}</span>
                <strong>换手 {{ (row.turnover * 100).toFixed(1) }}%</strong>
                <span>成本 {{ (row.estimated_cost * 100).toFixed(2) }}%</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
