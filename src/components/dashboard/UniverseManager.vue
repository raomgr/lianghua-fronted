<script setup>
import { computed } from "vue";

const props = defineProps({
  customUniverseItems: { type: Array, default: () => [] },
  customUniverseInput: { type: String, default: "" },
  universeSearchQuery: { type: String, default: "" },
  universeSearchResults: { type: Array, default: () => [] },
  customUniverseSymbols: { type: Object, required: true },
  canSaveUniverse: { type: Boolean, default: false },
  savingUniverse: { type: Boolean, default: false },
  lastUniverseMessage: { type: String, default: "" },
});

const emit = defineEmits([
  "update:customUniverseInput",
  "update:universeSearchQuery",
  "search",
  "save",
  "clear",
  "add",
  "remove",
]);

const searchQueryModel = computed({
  get: () => props.universeSearchQuery,
  set: (value) => emit("update:universeSearchQuery", value),
});

const universeInputModel = computed({
  get: () => props.customUniverseInput,
  set: (value) => emit("update:customUniverseInput", value),
});
</script>

<template>
  <section class="panel section-panel universe-panel">
    <div class="section-head compact-head">
      <div>
        <div class="section-title">自定义股票池</div>
      </div>
      <div class="status-pill">已选 {{ customUniverseItems.length }} 只</div>
    </div>

    <div class="universe-search-row">
      <input
        v-model="searchQueryModel"
        class="search-input"
        placeholder="搜索股票名称或代码，例如 茅台 / 600519"
        @keydown.enter.prevent="$emit('search')"
      >
      <button class="secondary-button" @click="$emit('search')">搜索</button>
    </div>

    <div class="universe-manager">
      <section class="universe-column workspace-card">
        <div class="selection-header">
          <div class="section-title sub-title">搜索结果</div>
        </div>
        <div v-if="universeSearchResults.length" class="history-list card-scroll">
          <div v-for="item in universeSearchResults" :key="`search-${item.symbol}`" class="history-row">
            <span>{{ item.symbol }}</span>
            <strong>{{ item.name }}</strong>
            <button
              class="secondary-button"
              :disabled="customUniverseSymbols.has(item.symbol)"
              @click="$emit('add', item)"
            >
              {{ customUniverseSymbols.has(item.symbol) ? "已加入" : "加入" }}
            </button>
          </div>
        </div>
        <div v-else class="compact-empty">暂无结果</div>
      </section>

      <section class="universe-column workspace-card">
        <div class="selection-header">
          <div class="section-title sub-title">当前已选</div>
          <button class="secondary-button" :disabled="!customUniverseItems.length" @click="$emit('clear')">清空</button>
        </div>
        <div v-if="customUniverseItems.length" class="history-list card-scroll">
          <div v-for="item in customUniverseItems" :key="item.symbol" class="history-row">
            <span>{{ item.symbol }}</span>
            <strong>{{ item.name }}</strong>
            <button class="secondary-button" @click="$emit('remove', item.symbol)">移除</button>
          </div>
        </div>
        <div v-else class="compact-empty">暂无股票</div>
      </section>
    </div>

    <div class="manual-entry">
      <div class="section-head inline-head">
        <div class="section-title sub-title">批量粘贴代码</div>
      </div>
      <textarea
        v-model="universeInputModel"
        rows="4"
        class="universe-input"
        placeholder="000001&#10;600519&#10;300750"
      />
    </div>

    <div class="hero-actions universe-actions">
      <button class="primary-button" :disabled="!canSaveUniverse || savingUniverse" @click="$emit('save')">
        {{ savingUniverse ? "保存并同步中..." : "保存股票池并同步" }}
      </button>
      <span v-if="lastUniverseMessage" class="update-message subdued-inline">{{ lastUniverseMessage }}</span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.status-pill {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(22, 101, 52, 0.06);
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
}

.universe-manager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 14px;
  align-items: stretch;
}

.universe-column {
  display: grid;
  gap: 12px;
  min-height: 0;
}

.universe-panel {
  gap: 0;
}

.universe-search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.selection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sub-title {
  margin-bottom: 0;
}

.manual-entry {
  margin-top: 18px;
}

.workspace-card {
  min-height: 300px;
  padding: 14px 0 0;
  border-radius: 0;
  border: 0;
  border-top: 1px solid rgba(32, 43, 35, 0.08);
  background: transparent;
}

.subdued-inline {
  max-width: 560px;
}

@media (max-width: 900px) {
  .universe-manager {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .universe-search-row {
    grid-template-columns: 1fr;
  }
}
</style>
