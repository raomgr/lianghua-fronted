<script setup>
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from "vue";
import { InfoFilled } from "@element-plus/icons-vue";
import StockTablePanel from "./StockTablePanel.vue";

const PriceHistoryChart = defineAsyncComponent(() => import("../charts/PriceHistoryChart.vue"));

const props = defineProps({
  stocks: { type: Array, default: () => [] },
  selectedSymbol: { type: String, default: "" },
  selectedStock: { type: Object, default: null },
  visibleHistory: { type: Array, default: () => [] },
  selectedHistoryStats: { type: Object, default: null },
  selectedFactorCards: { type: Array, default: () => [] },
  selectedHistoryRange: { type: String, default: "3m" },
  selectedChartMode: { type: String, default: "candle" },
  selectedIndicator: { type: String, default: "none" },
  selectedPriceBasis: { type: String, default: "qfq" },
  historyRangeOptions: { type: Array, default: () => [] },
  chartModeOptions: { type: Array, default: () => [] },
  indicatorOptions: { type: Array, default: () => [] },
  priceBasisOptions: { type: Array, default: () => [] },
  topPrediction: { type: Object, default: null },
  predictions: { type: Array, default: () => [] },
  latestRebalance: { type: Object, default: null },
  rebalances: { type: Array, default: () => [] },
});

const emit = defineEmits([
  "select",
  "update:selectedHistoryRange",
  "update:selectedChartMode",
  "update:selectedIndicator",
  "update:selectedPriceBasis",
]);

const chartStart = computed(() => props.visibleHistory[0]?.trade_date ?? "");
const chartEnd = computed(() => props.visibleHistory.at(-1)?.trade_date ?? "");
const latestHoldings = computed(() => props.latestRebalance?.holdings ?? []);
const latestPredictionRows = computed(() => props.predictions.slice(0, 8));
const researchBodyRef = ref(null);

watch(
  () => props.selectedSymbol,
  async () => {
    await nextTick();
    if (researchBodyRef.value) {
      researchBodyRef.value.scrollTop = 0;
    }
  },
);

onMounted(async () => {
  await nextTick();
  if (researchBodyRef.value) {
    researchBodyRef.value.scrollTop = 0;
  }
});

function sectionTip(text) {
  return text;
}
</script>

<template>
  <section class="panel section-panel research-workspace-panel">
    <div class="research-layout">
      <aside class="research-sidebar">
        <StockTablePanel
          :stocks="stocks"
          :selected-symbol="selectedSymbol"
          @select="emit('select', $event)"
        />
      </aside>

      <div class="research-main">
        <section class="panel inner-panel research-detail-panel">
          <template v-if="selectedStock">
            <div class="research-overview">
              <div class="research-identity">
                <h2 class="detail-title">{{ selectedStock.name }}</h2>
                <div class="research-symbol-row">
                  <div class="research-symbol">{{ selectedStock.symbol }}</div>
                  <div class="detail-meta">
                    <span v-if="selectedStock.industry">{{ selectedStock.industry }}</span>
                    <span v-if="selectedStock.market">{{ selectedStock.market }}</span>
                    <span v-if="selectedStock.area">{{ selectedStock.area }}</span>
                  </div>
                </div>
              </div>

              <div class="research-quote-panel">
                <div class="research-quote-group">
                  <span>涨跌幅</span>
                  <div class="detail-badge" :class="selectedStock.pct_change >= 0 ? 'positive-fill' : 'negative-fill'">
                    {{ selectedStock.pct_change.toFixed(2) }}%
                  </div>
                </div>
                <div class="research-quote-group research-quote-value">
                  <span>当前价格</span>
                  <strong>{{ selectedStock.latest_price.toFixed(2) }}</strong>
                </div>
              </div>
            </div>
          </template>

          <p v-else class="empty-copy">先从左侧股票池中选择一只股票，再查看行情、估值和模型信号。</p>
        </section>

        <div :key="selectedSymbol || 'research-empty'" ref="researchBodyRef" class="research-body">
          <template v-if="selectedStock">
            <div class="research-controls">
              <div class="research-control-group">
                <span class="research-control-label">区间</span>
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
              </div>

              <div class="research-control-group">
                <span class="research-control-label">图形</span>
                <div class="range-switch">
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
              </div>

              <div class="research-control-group">
                <span class="research-control-label">价格口径</span>
                <div class="range-switch">
                  <button
                    v-for="option in priceBasisOptions"
                    :key="option.key"
                    class="range-chip"
                    :class="{ active: selectedPriceBasis === option.key }"
                    @click="emit('update:selectedPriceBasis', option.key)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div class="research-control-group">
                <span class="research-control-label">指标</span>
                <div class="range-switch">
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

              <div v-if="selectedFactorCards.length" class="research-facts-panel">
                <div class="section-title">关键指标</div>
                <div class="research-facts-grid">
                  <div v-for="card in selectedFactorCards" :key="card.label" class="research-fact-row">
                    <span>{{ card.label }}</span>
                    <strong>{{ card.value }}</strong>
                  </div>
                </div>
              </div>
            </template>
            <p v-else class="empty-copy">暂无个股历史数据。</p>

            <div class="research-support-grid">
          <section class="panel compact-panel research-support-panel">
            <div class="section-head">
              <div class="signal-title-row">
                <div class="section-title">模型候选排行</div>
                <el-tooltip effect="light" placement="right" :content="sectionTip('按当前模型预测收益查看近期最看好的候选股票。')">
                  <el-icon class="signal-info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </div>

            <div v-if="topPrediction" class="model-highlight">
              <div class="model-highlight-main">
                <strong>{{ topPrediction.symbol }} {{ topPrediction.name }}</strong>
                <span>{{ topPrediction.model_name }}</span>
              </div>
              <div class="model-highlight-score">预测 5 日收益 {{ (topPrediction.predicted_return_5d * 100).toFixed(2) }}%</div>
            </div>

            <el-table v-if="latestPredictionRows.length" :data="latestPredictionRows" class="compact-data-table" table-layout="fixed">
              <el-table-column label="排名" width="86">
                <template #default="{ row }">#{{ row.rank }}</template>
              </el-table-column>
              <el-table-column prop="symbol" label="代码" width="110" />
              <el-table-column prop="name" label="名称" min-width="140" />
              <el-table-column label="预测5日收益" width="130">
                <template #default="{ row }">{{ (row.predicted_return_5d * 100).toFixed(2) }}%</template>
              </el-table-column>
            </el-table>
            <p v-else class="empty-copy">暂无模型优选记录。</p>
          </section>

          <section class="panel compact-panel research-support-panel">
            <div class="section-head">
              <div class="signal-title-row">
                <div class="section-title">当前持仓与最近调仓</div>
                <el-tooltip effect="light" placement="right" :content="sectionTip('先看当前持有哪些股票，再看最近几次调仓的换手和成本。')">
                  <el-icon class="signal-info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </div>

            <div class="support-subsection">
              <div class="support-subtitle">当前持仓</div>
              <el-table v-if="latestHoldings.length" :data="latestHoldings" class="compact-data-table" table-layout="fixed">
                <el-table-column prop="symbol" label="代码" width="110" />
                <el-table-column prop="name" label="名称" min-width="140" />
                <el-table-column label="评分" width="100">
                  <template #default="{ row }">{{ row.score.toFixed(3) }}</template>
                </el-table-column>
              </el-table>
              <p v-else class="empty-copy">暂无当前持仓。</p>
            </div>

            <div class="support-subsection secondary-table">
              <div class="support-subtitle">最近调仓记录</div>
              <el-table v-if="rebalances.length" :data="rebalances.slice(0, 6)" class="compact-data-table" table-layout="fixed">
                <el-table-column prop="trade_date" label="交易日" min-width="128" />
                <el-table-column label="换手" width="100">
                  <template #default="{ row }">{{ (row.turnover * 100).toFixed(1) }}%</template>
                </el-table-column>
                <el-table-column label="成本" width="100">
                  <template #default="{ row }">{{ (row.estimated_cost * 100).toFixed(2) }}%</template>
                </el-table-column>
              </el-table>
              <p v-else class="empty-copy">暂无最近调仓记录。</p>
            </div>
          </section>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.research-workspace-panel {
  display: grid;
  gap: 20px;
  overflow: hidden;
}

.research-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
  align-items: stretch;
  min-height: 0;
}

.research-sidebar {
  position: sticky;
  top: 16px;
  align-self: start;
  height: calc(100vh - 180px);
  min-height: 760px;
  min-width: 0;
}

.research-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 20px;
  min-width: 0;
  height: calc(100vh - 180px);
  min-height: 760px;
  overflow: hidden;
}

.research-body {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overflow-x: hidden;
  padding-right: 6px;
}

:deep(.research-picker-panel) {
  height: 100%;
  max-height: none;
}

:deep(.research-picker-scroll) {
  flex: 1;
  min-height: 0;
  max-height: none;
}

.research-detail-panel {
  min-height: auto;
  display: grid;
  gap: 16px;
  margin-top: 0;
}

.research-workspace-panel :deep(.panel) {
  box-shadow: none;
}

.research-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: start;
}

.research-identity {
  min-width: 0;
}

.detail-title {
  margin: 0;
  font-size: 32px;
  line-height: 1.05;
  word-break: break-word;
}

.research-symbol {
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.research-symbol-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.detail-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 12px;
  min-width: 0;
}

.detail-meta span {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(20, 108, 67, 0.12);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 10px;
  padding: 4px 10px;
  line-height: 1.2;
}

.research-quote-panel {
  display: flex;
  align-items: flex-end;
  gap: 0;
  min-width: 0;
}

.research-quote-group {
  display: grid;
  gap: 4px;
  align-content: end;
  padding: 0 20px;
  min-width: 0;
}

.research-quote-group + .research-quote-group {
  border-left: 1px solid var(--line);
}

.research-quote-group span {
  color: var(--muted);
  font-size: 12px;
}

.research-quote-group strong {
  font-size: 24px;
  line-height: 1;
  white-space: nowrap;
}

.research-quote-value {
  min-width: 120px;
}

.detail-badge {
  padding: 0;
  font-size: 18px;
  font-weight: 700;
  justify-self: start;
  background: transparent;
}

.positive-fill {
  color: var(--accent);
}

.negative-fill {
  color: var(--negative);
}

.research-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.44);
  min-width: 0;
  overflow: hidden;
}

.research-control-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex: 0 1 auto;
  min-width: 0;
}

.research-control-group + .research-control-group {
  padding-left: 16px;
  border-left: 1px solid var(--line);
}

.research-control-label {
  width: auto;
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.range-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.range-chip {
  border: 1px solid rgba(20, 108, 67, 0.14);
  background: rgba(255, 255, 255, 0.6);
  color: var(--muted);
  border-radius: 10px;
  padding: 7px 12px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  line-height: 1.2;
}

.range-chip.active {
  background: rgba(22, 101, 52, 0.1);
  color: var(--accent);
  border-color: rgba(22, 101, 52, 0.22);
  font-weight: 700;
}

.detail-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin: 20px 0 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.56);
}

.detail-metrics div {
  padding: 14px 16px;
  border-right: 1px solid var(--line);
}

.detail-metrics div:last-child {
  border-right: none;
}

.detail-metrics span {
  display: block;
  color: var(--muted);
  font-size: 12px;
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
  font-size: 12px;
  margin-top: 6px;
}

.price-chart-shell {
  min-width: 0;
  overflow: hidden;
}

.research-facts-panel {
  margin-top: 20px;
  margin-bottom: 20px;
}

.research-facts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.56);
}

.research-fact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--line);
  border-right: 1px solid var(--line);
}

.research-fact-row:nth-child(2n) {
  border-right: none;
}

.research-fact-row:nth-last-child(-n + 2) {
  border-bottom: none;
}

.research-fact-row span {
  color: var(--muted);
  font-size: 14px;
}

.research-fact-row strong {
  font-size: 16px;
}

.research-support-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  min-width: 0;
  margin-top: 20px;
}

.research-support-panel {
  min-height: auto;
  overflow: hidden;
}

.support-subsection + .support-subsection {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.support-subtitle {
  margin-bottom: 10px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.signal-title-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.signal-title-row .section-title {
  margin-bottom: 0;
  display: inline-flex;
  align-items: center;
  line-height: 1.2;
}

.signal-info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1;
  cursor: help;
  transform: translateY(1px);
}

.model-highlight {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  border-radius: 12px;
  padding: 16px;
  background: rgba(22, 101, 52, 0.06);
  border: 1px solid rgba(22, 101, 52, 0.1);
}

.model-highlight-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.model-highlight-main strong {
  font-size: 18px;
}

.model-highlight-main span {
  color: var(--muted);
  font-size: 12px;
}

.model-highlight-score {
  color: var(--accent);
  font-size: 15px;
  font-weight: 700;
  min-width: 0;
  text-align: right;
}

:deep(.compact-data-table.el-table) {
  --el-table-header-bg-color: rgba(243, 244, 233, 0.96);
  --el-table-row-hover-bg-color: rgba(243, 244, 233, 0.32);
  --el-table-text-color: var(--text);
  --el-table-header-text-color: var(--muted);
}

.secondary-table {
  margin-top: 18px;
}

.empty-copy {
  color: var(--muted);
  font-size: 14px;
}

@media (max-width: 1080px) {
  .research-layout {
    grid-template-columns: 1fr;
  }

  .research-sidebar {
    position: static;
    height: auto;
    min-height: 0;
  }

  .research-support-grid {
    grid-template-columns: 1fr;
  }

  .research-main {
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .research-body {
    overflow: visible;
    padding-right: 0;
  }

  :deep(.research-picker-panel),
  :deep(.research-picker-scroll) {
    height: auto;
  }
}

@media (max-width: 960px) {
  .research-overview,
  .research-quote-panel {
    grid-template-columns: 1fr;
  }

  .research-quote-panel {
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 12px 0;
  }

  .research-quote-group {
    padding: 0 16px 0 0;
  }

  .research-quote-group + .research-quote-group {
    padding: 0 0 0 16px;
  }

  .research-control-group {
    flex: 1 1 100%;
    flex-wrap: wrap;
  }

  .detail-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .detail-metrics div:nth-child(2n) {
    border-right: none;
  }

  .detail-metrics div:nth-child(-n + 2) {
    border-bottom: 1px solid var(--line);
  }
}

@media (max-width: 720px) {
  .detail-title {
    font-size: 28px;
  }

  .research-control-group {
    align-items: flex-start;
    gap: 8px;
  }

  .research-control-label {
    flex-basis: 100%;
  }

  .research-facts-grid {
    grid-template-columns: 1fr;
  }

  .research-fact-row,
  .research-fact-row:nth-child(2n) {
    border-right: none;
  }

  .research-fact-row:nth-last-child(-n + 2) {
    border-bottom: 1px solid var(--line);
  }

  .research-fact-row:last-child {
    border-bottom: none;
  }

  .detail-metrics {
    grid-template-columns: 1fr;
  }

  .detail-metrics div {
    border-right: none;
    border-bottom: 1px solid var(--line);
  }

  .detail-metrics div:last-child {
    border-bottom: none;
  }

  .model-highlight {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
