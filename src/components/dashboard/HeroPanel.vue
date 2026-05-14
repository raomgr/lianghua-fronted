<script setup>
defineProps({
  updating: { type: Boolean, default: false },
  training: { type: Boolean, default: false },
  lastUpdateMessage: { type: String, default: "" },
  lastTrainMessage: { type: String, default: "" },
});

defineEmits(["refresh", "train"]);
</script>

<template>
  <section class="panel hero-panel">
    <div class="hero-topbar">
      <div class="hero-copy-block">
        <p class="eyebrow">A-Share Quant Dashboard</p>
        <h2>A股量化总览</h2>
      </div>

      <div class="hero-command">
        <div class="hero-actions hero-actions-top">
          <button class="primary-button" :disabled="updating" @click="$emit('refresh')">
            {{ updating ? "同步中..." : "同步并重算数据" }}
          </button>
          <button class="secondary-button" :disabled="training" @click="$emit('train')">
            {{ training ? "训练中..." : "训练本地模型" }}
          </button>
        </div>
        <div v-if="lastUpdateMessage || lastTrainMessage" class="hero-message-stack">
          <span v-if="lastUpdateMessage" class="update-message">同步：{{ lastUpdateMessage }}</span>
          <span v-if="lastTrainMessage" class="update-message">训练：{{ lastTrainMessage }}</span>
        </div>
      </div>
    </div>

  </section>
</template>

<style scoped lang="scss">
.hero-panel {
  margin-top: 0;
}

.hero-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.hero-copy-block {
  min-width: 0;
}

.hero-copy-block h2 {
  margin: 0;
  font-size: clamp(1.7rem, 2vw, 2.25rem);
  line-height: 1.12;
  letter-spacing: 0;
}

.hero-command {
  display: grid;
  justify-items: end;
  gap: 10px;
  flex-shrink: 0;
}

.hero-message-stack {
  display: grid;
  gap: 4px;
  justify-items: end;
}

.hero-actions-top {
  margin-top: 0;
}

@media (max-width: 900px) {
  .hero-topbar {
    flex-direction: column;
  }

  .hero-command {
    width: 100%;
    justify-items: start;
  }

  .hero-message-stack {
    justify-items: start;
  }

}
</style>
