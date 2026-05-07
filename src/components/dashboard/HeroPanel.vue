<script setup>
defineProps({
  summaryChips: { type: Array, default: () => [] },
  updating: { type: Boolean, default: false },
  training: { type: Boolean, default: false },
  lastUpdateMessage: { type: String, default: "" },
  lastTrainMessage: { type: String, default: "" },
});

defineEmits(["refresh", "train"]);
</script>

<template>
  <section class="panel hero-panel">
    <p class="eyebrow">A-Share Quant Dashboard</p>
    <h3>面向 A 股的数据、因子、回测与模型看板</h3>
    <p class="hero-copy">
      现在这套本地版已经能跑真实数据、回测和多模型对比。接下来你可以在同一块面板里管理股票池、刷新数据、训练模型并观察信号变化。
    </p>
    <div class="summary-chip-row">
      <div v-for="item in summaryChips" :key="item.label" class="summary-chip">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
    <div class="hero-actions">
      <button class="primary-button" :disabled="updating" @click="$emit('refresh')">
        {{ updating ? "同步中..." : "同步并重算数据" }}
      </button>
      <button class="secondary-button" :disabled="training" @click="$emit('train')">
        {{ training ? "训练中..." : "训练本地模型" }}
      </button>
      <span v-if="lastUpdateMessage" class="update-message">{{ lastUpdateMessage }}</span>
      <span v-if="lastTrainMessage" class="update-message">{{ lastTrainMessage }}</span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero-panel {
  margin-top: 0;
}

.summary-chip-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 22px;
}

.summary-chip {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.45);
}

.summary-chip span {
  display: block;
  color: var(--muted);
  font-size: 13px;
}

.summary-chip strong {
  display: block;
  margin-top: 8px;
  font-size: 16px;
}

@media (max-width: 900px) {
  .summary-chip-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .summary-chip-row {
    grid-template-columns: 1fr;
  }
}
</style>
