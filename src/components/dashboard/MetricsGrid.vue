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
