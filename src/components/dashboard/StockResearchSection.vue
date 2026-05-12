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
          <div v-if="selectedStock" class="detail-meta">
            <span v-if="selectedStock.industry">{{ selectedStock.industry }}</span>
            <span v-if="selectedStock.market">{{ selectedStock.market }}</span>
            <span v-if="selectedStock.area">{{ selectedStock.area }}</span>
          </div>
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

<style scoped lang="scss">
.detail-panel,
.history-panel {
  min-height: auto;
}

.detail-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}

.detail-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toolbar-switches {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.detail-title {
  margin: 0;
  font-size: 32px;
  line-height: 1;
}

.detail-title span {
  color: var(--muted);
  font-size: 16px;
  font-weight: 500;
}

.detail-meta {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 12px;
}

.detail-meta span {
  border: 1px solid rgba(20, 108, 67, 0.12);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  padding: 4px 10px;
}

.detail-badge {
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 700;
}

.range-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-switch {
  padding-left: 10px;
  border-left: 1px solid rgba(32, 43, 35, 0.1);
}

.range-chip {
  border: 1px solid rgba(20, 108, 67, 0.14);
  background: rgba(255, 255, 255, 0.6);
  color: var(--muted);
  border-radius: 999px;
  padding: 7px 12px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.range-chip.active {
  background: rgba(22, 101, 52, 0.1);
  color: var(--accent);
  border-color: rgba(22, 101, 52, 0.22);
  font-weight: 700;
}

.positive-fill {
  background: rgba(22, 101, 52, 0.12);
  color: var(--accent);
}

.negative-fill {
  background: rgba(180, 35, 24, 0.12);
  color: var(--negative);
}

.detail-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 20px 0;
}

.detail-metrics div {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 14px;
}

.detail-metrics span {
  display: block;
  color: var(--muted);
  font-size: 14px;
}

.detail-metrics strong {
  display: block;
  margin-top: 8px;
  font-size: 20px;
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 14px;
  margin-top: 6px;
}

.model-highlight {
  margin-bottom: 16px;
  border-radius: 18px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(22, 101, 52, 0.13), rgba(243, 181, 70, 0.1));
  border: 1px solid rgba(22, 101, 52, 0.12);
}

.model-highlight-symbol {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.model-highlight-score {
  margin: 8px 0 12px;
  color: var(--accent);
  font-weight: 700;
}

.factor-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.factor-card {
  border-radius: 18px;
  padding: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.46);
}

.factor-card span {
  display: block;
  color: var(--muted);
  font-size: 13px;
}

.factor-card strong {
  display: block;
  margin-top: 8px;
  font-size: 17px;
}

@media (max-width: 960px) {
  .detail-header,
  .detail-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-switches {
    justify-content: flex-start;
  }

  .detail-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .factor-card-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .detail-title {
    font-size: 28px;
  }

  .mode-switch {
    padding-left: 0;
    border-left: 0;
  }

  .detail-metrics {
    grid-template-columns: 1fr;
  }

  .factor-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
