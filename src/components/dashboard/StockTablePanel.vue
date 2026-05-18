<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  stocks: { type: Array, default: () => [] },
  selectedSymbol: { type: String, default: "" },
});

defineEmits(["select"]);

const filterQuery = ref("");

const rowClassName = ({ row }) => (row.symbol === props.selectedSymbol ? "is-selected-row" : "");

const filteredStocks = computed(() => {
  const query = filterQuery.value.trim().toLowerCase();
  if (!query) {
    return props.stocks;
  }
  return props.stocks.filter((row) => {
    const symbol = String(row.symbol ?? "").toLowerCase();
    const name = String(row.name ?? "").toLowerCase();
    const industry = String(row.industry ?? "").toLowerCase();
    return symbol.includes(query) || name.includes(query) || industry.includes(query);
  });
});
</script>

<template>
  <section class="panel research-picker-panel">
    <div class="table-header">
      <div class="section-title">研究股票池</div>
      <span class="research-picker-count">{{ filteredStocks.length }} 只</span>
    </div>
    <div class="research-picker-toolbar">
      <el-input v-model="filterQuery" size="large" class="research-picker-search" placeholder="搜索代码、名称、行业" clearable />
    </div>
    <div class="research-picker-scroll">
      <el-table
        :data="filteredStocks"
        height="100%"
        table-layout="fixed"
        row-key="symbol"
        class="research-picker-table"
        :row-class-name="rowClassName"
        @row-click="$emit('select', $event.symbol)"
      >
        <el-table-column label="股票" min-width="0">
          <template #default="{ row }">
            <div class="research-picker-stock">
              <span class="research-picker-name">{{ row.name }}</span>
              <span>{{ row.symbol }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="现价" width="74">
          <template #default="{ row }">
            {{ row.latest_price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="涨跌" width="88">
          <template #default="{ row }">
            <span :class="row.pct_change >= 0 ? 'positive' : 'negative'">
              {{ row.pct_change.toFixed(2) }}%
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </section>
</template>

<style scoped lang="scss">
.research-picker-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
  overflow: hidden;
}

.table-header {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  .section-title{
    margin-bottom: 0;
  }
}


.research-picker-toolbar {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.research-picker-search {
  flex: 1;
  min-width: 0;
}

.research-picker-count {
  color: var(--muted);
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
}

.research-picker-scroll {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.research-picker-stock {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.research-picker-name {
  font-size: 14px;
  line-height: 1.35;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.research-picker-stock span {
  color: var(--muted);
  font-size: 12px;
}

:deep(.research-picker-table.el-table) {
  --el-table-header-bg-color: rgba(243, 244, 233, 0.96);
  --el-table-row-hover-bg-color: rgba(243, 244, 233, 0.42);
  --el-table-current-row-bg-color: rgba(243, 244, 233, 0.82);
  --el-table-text-color: var(--text);
  --el-table-header-text-color: var(--muted);
  background: transparent;
}

:deep(.research-picker-table .el-table__body tr.is-selected-row > td.el-table__cell) {
  background: rgba(22, 101, 52, 0.08);
}

//:deep(.research-picker-table .el-table__body tr.is-selected-row > td.el-table__cell:first-child) {
//  box-shadow: inset 3px 0 0 var(--accent);
//}

:deep(.research-picker-table .el-table__body tr.is-selected-row .research-picker-stock span) {
  color: var(--text);
}
</style>
