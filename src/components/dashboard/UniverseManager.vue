<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  customUniverseItems: { type: Array, default: () => [] },
  customUniverseInput: { type: String, default: "" },
  universeSearchQuery: { type: String, default: "" },
  universeSearchResults: { type: Array, default: () => [] },
  universeSearchPage: { type: Number, default: 1 },
  universeSearchPageSize: { type: Number, default: 6 },
  universeSearchTotal: { type: Number, default: 0 },
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
  "page-search",
]);

const searchQueryModel = computed({
  get: () => props.universeSearchQuery,
  set: (value) => emit("update:universeSearchQuery", value),
});

const universeInputModel = computed({
  get: () => props.customUniverseInput,
  set: (value) => emit("update:customUniverseInput", value),
});

const selectedPage = ref(1);
const SELECTED_PAGE_SIZE = 6;

const paginatedSelectedItems = computed(() => {
  const start = (selectedPage.value - 1) * SELECTED_PAGE_SIZE;
  return props.customUniverseItems.slice(start, start + SELECTED_PAGE_SIZE);
});

watch(() => props.customUniverseItems.length, (count) => {
  const maxPage = Math.max(1, Math.ceil(count / SELECTED_PAGE_SIZE));
  if (selectedPage.value > maxPage) {
    selectedPage.value = maxPage;
  }
}, { immediate: true });
</script>

<template>
  <section class="panel section-panel universe-panel">
    <div class="section-head compact-head">
      <div>
        <div class="section-title">自定义股票池</div>
      </div>
      <div class="status-pill">已选 {{ customUniverseItems.length }} 只</div>
    </div>

    <div class="universe-toolbar">
      <el-input
        v-model="searchQueryModel"
        size="large"
        placeholder="搜索股票名称或代码，例如 茅台 / 600519"
        @keydown.enter.prevent="$emit('search')"
      />
      <el-button type="primary" size="large" @click="$emit('search')">搜索</el-button>
    </div>

    <div class="universe-split">
      <section class="universe-pane">
        <div class="selection-header">
          <div class="section-title sub-title">搜索结果</div>
        </div>
        <template v-if="universeSearchResults.length">
          <div class="universe-list">
            <div v-for="item in universeSearchResults" :key="`search-${item.symbol}`" class="universe-row">
              <div class="universe-stock-main">
                <strong>{{ item.name }}</strong>
                <span>{{ item.symbol }}</span>
              </div>
              <el-button
                plain
                size="default"
                :disabled="customUniverseSymbols.has(item.symbol)"
                @click="$emit('add', item)"
              >
                {{ customUniverseSymbols.has(item.symbol) ? "已加入" : "加入" }}
              </el-button>
            </div>
          </div>
          <div v-if="universeSearchTotal > universeSearchPageSize" class="universe-pagination">
            <el-pagination
              :current-page="universeSearchPage"
              :page-size="universeSearchPageSize"
              layout="prev, pager, next, total"
              background
              :total="universeSearchTotal"
              @current-change="$emit('page-search', $event)"
            />
          </div>
        </template>
        <div v-else class="universe-empty">{{ universeSearchQuery ? "暂无结果" : "输入名称或代码后搜索股票" }}</div>
      </section>

      <section class="universe-pane">
        <div class="selection-header">
          <div class="section-title sub-title">当前已选</div>
          <el-button type="danger" plain size="default" :disabled="!customUniverseItems.length" @click="$emit('clear')">清空</el-button>
        </div>
        <template v-if="customUniverseItems.length">
          <div class="universe-list">
            <div v-for="item in paginatedSelectedItems" :key="item.symbol" class="universe-row">
              <div class="universe-stock-main">
                <strong>{{ item.name }}</strong>
                <span>{{ item.symbol }}</span>
              </div>
              <el-button type="danger" plain size="default" @click="$emit('remove', item.symbol)">移除</el-button>
            </div>
          </div>
          <div v-if="customUniverseItems.length > SELECTED_PAGE_SIZE" class="universe-pagination">
            <el-pagination
              v-model:current-page="selectedPage"
              :page-size="SELECTED_PAGE_SIZE"
              layout="prev, pager, next, total"
              background
              :total="customUniverseItems.length"
            />
          </div>
        </template>
        <div v-else class="universe-empty">当前没有已选股票</div>
      </section>
    </div>

    <section class="universe-bulk">
      <div class="selection-header">
        <div class="section-title sub-title">批量补充代码</div>
        <el-button type="primary" size="large" :disabled="!canSaveUniverse || savingUniverse" @click="$emit('save')">
          {{ savingUniverse ? "保存并同步中..." : "保存股票池并同步" }}
        </el-button>
      </div>
      <div class="universe-bulk-body">
        <el-input
          v-model="universeInputModel"
          type="textarea"
          :rows="4"
          placeholder="000001&#10;600519&#10;300750"
        />
        <span v-if="lastUniverseMessage" class="update-message subdued-inline">{{ lastUniverseMessage }}</span>
      </div>
    </section>
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

.universe-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 14px;
}

.universe-panel {
  display: grid;
  gap: 16px;
}

.universe-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  max-width: 720px;
}

.selection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sub-title {
  margin-bottom: 0;
  font-size: 0.95rem;
}

.universe-pane {
  display: grid;
  gap: 12px;
  min-width: 0;
  min-height: 260px;
  padding: 16px 18px;
  border: 1px solid rgba(32, 43, 35, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.34);
}

.universe-list {
  display: grid;
  gap: 8px;
  align-content: start;
}

.universe-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.universe-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(32, 43, 35, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.64);
}

.universe-stock-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.universe-stock-main strong {
  font-size: 1rem;
  line-height: 1.3;
}

.universe-stock-main span {
  color: var(--muted);
  font-size: 0.92rem;
}

.universe-empty {
  display: grid;
  place-items: center;
  min-height: 120px;
  color: var(--muted);
  border: 1px dashed rgba(32, 43, 35, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.3);
  font-size: 0.92rem;
}

.universe-bulk {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid rgba(32, 43, 35, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.34);
}

.universe-bulk-body {
  display: grid;
  gap: 12px;
}

.subdued-inline {
  max-width: 560px;
}

@media (max-width: 900px) {
  .universe-split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .universe-toolbar {
    flex-direction: column;
    align-items: stretch;
    max-width: none;
  }

  .universe-row,
  .selection-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
