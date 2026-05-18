<script setup>
import { computed } from "vue";

const props = defineProps({
  metricCards: { type: Array, default: () => [] },
});

const cardMap = computed(() => {
  const map = new Map();
  props.metricCards.forEach((item) => map.set(item.label, item));
  return map;
});

function pick(labels) {
  return labels.map((label) => cardMap.value.get(label)).filter(Boolean);
}

const returnCards = computed(() => pick(["策略总收益", "基准收益", "超额收益", "年化收益"]));
const riskCards = computed(() => pick(["最大回撤", "年化波动", "Sharpe", "Sortino", "Calmar", "信息比率"]));
const styleCards = computed(() => pick(["Alpha", "Beta"]));
const tradingCards = computed(() => pick(["平均换手", "累计成本"]));
</script>

<template>
  <section class="perf-board panel">
    <header class="perf-board-header">
      <div>
        <p class="perf-board-eyebrow">策略表现总览</p>
        <h2 class="perf-board-title">回测结果</h2>
      </div>
    </header>

    <div class="perf-board-stack">
      <section v-if="returnCards.length" class="perf-panel">
        <div class="perf-panel-head">
          <div>
            <h3 class="perf-panel-title">收益表现</h3>
            <p class="perf-panel-subtitle">先看策略收益、基准收益和超额表现。</p>
          </div>
        </div>
        <div class="perf-return-grid">
          <article
            v-for="(item, index) in returnCards"
            :key="item.label"
            class="perf-return-card"
            :class="{ primary: index === 0 }"
          >
            <span class="perf-item-label">{{ item.label }}</span>
            <strong class="perf-item-value">{{ item.value }}{{ item.suffix }}</strong>
          </article>
        </div>
      </section>

      <div class="perf-detail-grid">
        <section v-if="riskCards.length" class="perf-panel">
          <div class="perf-panel-head">
            <div>
              <h3 class="perf-panel-title">风险质量</h3>
              <p class="perf-panel-subtitle">收益波动、回撤和风险调整后收益放在一组。</p>
            </div>
          </div>
          <div class="perf-metric-grid">
            <article v-for="item in riskCards" :key="item.label" class="perf-metric-row">
              <span class="perf-item-label">{{ item.label }}</span>
              <strong class="perf-row-value">{{ item.value }}{{ item.suffix }}</strong>
            </article>
          </div>
        </section>

        <section class="perf-panel perf-side-panel">
          <div v-if="styleCards.length" class="perf-side-block">
            <div class="perf-panel-head compact">
              <div>
                <h3 class="perf-panel-title">风格暴露</h3>
                <p class="perf-panel-subtitle">看 Alpha、Beta 是否符合你的预期风格。</p>
              </div>
            </div>
            <div class="perf-compact-list">
              <article v-for="item in styleCards" :key="item.label" class="perf-metric-row compact">
                <span class="perf-item-label">{{ item.label }}</span>
                <strong class="perf-row-value">{{ item.value }}{{ item.suffix }}</strong>
              </article>
            </div>
          </div>

          <div v-if="tradingCards.length" class="perf-side-block">
            <div class="perf-panel-head compact">
              <div>
                <h3 class="perf-panel-title">交易特征</h3>
                <p class="perf-panel-subtitle">看换手和成本，判断这套参数是否适合实盘跟踪。</p>
              </div>
            </div>
            <div class="perf-compact-list">
              <article v-for="item in tradingCards" :key="item.label" class="perf-metric-row compact">
                <span class="perf-item-label">{{ item.label }}</span>
                <strong class="perf-row-value">{{ item.value }}{{ item.suffix }}</strong>
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.perf-board {
  display: grid;
  gap: 18px;
}

.perf-board-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.perf-board-eyebrow {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.perf-board-title {
  margin: 6px 0 0;
  font-size: 24px;
  line-height: 1.1;
}

.perf-board-stack {
  display: grid;
  gap: 16px;
}

.perf-panel {
  border: 1px solid rgba(32, 43, 35, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.48);
  padding: 18px 20px;
  display: grid;
  gap: 14px;
}

.perf-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.perf-panel-head.compact {
  margin-bottom: 2px;
}

.perf-panel-title {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
}

.perf-panel-subtitle {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.perf-return-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.perf-return-card {
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(32, 43, 35, 0.06);
  display: grid;
  gap: 8px;
}

.perf-return-card.primary {
  background: linear-gradient(135deg, rgba(22, 101, 52, 0.08), rgba(255, 249, 235, 0.86));
}

.perf-item-label {
  color: var(--muted);
  font-size: 13px;
}

.perf-item-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.perf-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.9fr);
  gap: 16px;
}

.perf-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 18px;
}

.perf-metric-row {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(32, 43, 35, 0.05);
}

.perf-metric-row.compact {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 0;
  border-radius: 0;
  background: transparent;
  border: 0;
}

.perf-row-value {
  font-size: 18px;
  font-weight: 700;
  text-align: left;
}

.perf-side-panel {
  gap: 18px;
}

.perf-side-block + .perf-side-block {
  padding-top: 18px;
  border-top: 1px solid rgba(32, 43, 35, 0.08);
}

.perf-compact-list {
  display: grid;
  gap: 4px;
}

@media (max-width: 1080px) {
  .perf-return-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .perf-detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .perf-return-grid,
  .perf-metric-grid {
    grid-template-columns: 1fr;
  }

  .perf-board-title {
    font-size: 22px;
  }
}
</style>
