<script setup>
import { computed } from "vue";

const props = defineProps({
  metricCards: { type: Array, default: () => [] },
});

const primaryCards = computed(() => props.metricCards.slice(0, 5));
const secondaryCards = computed(() => props.metricCards.slice(5));
</script>

<template>
  <section class="metrics-board section-panel">
    <div class="section-head compact-head">
      <div class="section-title">策略表现总览</div>
    </div>

    <div class="metric-grid metric-grid-primary">
      <section
        v-for="(card, index) in primaryCards"
        :key="card.label"
        class="metric-card"
        :class="{ accent: index === 0 }"
      >
        <div class="metric-label">{{ card.label }}</div>
        <div class="metric-value">{{ card.value }}{{ card.suffix }}</div>
      </section>
    </div>

    <div v-if="secondaryCards.length" class="metric-grid-secondary">
      <div class="metric-secondary-title">风险与交易细节</div>
      <section v-for="card in secondaryCards" :key="card.label" class="secondary-line">
        <span class="metric-label">{{ card.label }}</span>
        <strong class="secondary-value">{{ card.value }}{{ card.suffix }}</strong>
      </section>
    </div>
  </section>
</template>

<style scoped lang="scss">
.metrics-board {
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
}

.metric-grid-primary {
  margin: 0;
}

.metric-card {
  border: 1px solid rgba(32, 43, 35, 0.07);
  background: rgba(255, 255, 255, 0.34);
  border-radius: 8px;
  box-shadow: none;
  padding: 14px 16px;
}

.metric-label {
  color: var(--muted);
  font-size: 14px;
}

.metric-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
}

.metric-card.accent {
  background: linear-gradient(135deg, rgba(22, 101, 52, 0.08), rgba(255, 249, 235, 0.8));
}

.metric-grid-secondary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px 18px;
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid rgba(32, 43, 35, 0.08);
}

.metric-secondary-title {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.secondary-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
}

.secondary-value {
  font-size: 18px;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .metric-grid-secondary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .metric-grid-secondary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .metric-grid-secondary {
    grid-template-columns: 1fr;
  }
}
</style>
