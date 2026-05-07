<script setup>
defineProps({
  metricCards: { type: Array, default: () => [] },
});
</script>

<template>
  <section class="metric-grid">
    <section v-for="card in metricCards" :key="card.label" class="metric-card">
      <div class="metric-label">{{ card.label }}</div>
      <div class="metric-value">{{ card.value }}{{ card.suffix }}</div>
    </section>
  </section>
</template>

<style scoped lang="scss">
.metric-card {
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: var(--card);
  backdrop-filter: blur(14px);
  border-radius: 24px;
  box-shadow: var(--shadow);
  padding: 18px 20px;
}

.metric-label {
  color: var(--muted);
  font-size: 14px;
}

.metric-value {
  margin-top: 8px;
  font-size: 32px;
  font-weight: 700;
}
</style>
