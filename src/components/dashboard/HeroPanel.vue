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
