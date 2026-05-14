<script setup>
import { computed } from "vue";

const props = defineProps({
  modelStatus: { type: Object, required: true },
});

const headlineItems = computed(() => [
  { label: "系统状态", value: props.modelStatus.status || "-" },
  { label: "实际数据源", value: props.modelStatus.active_data_provider || props.modelStatus.provider || "-" },
  { label: "股票池规模", value: `${props.modelStatus.universe_size ?? 0} 只` },
  { label: "当前模型", value: props.modelStatus.latest_model_name || "未训练" },
]);

const detailItems = computed(() => [
  { label: "股票池来源", value: props.modelStatus.universe_source || "-" },
  { label: "自定义股票", value: `${props.modelStatus.custom_universe_size ?? 0} 只` },
  { label: "本地K线", value: `${props.modelStatus.total_bars ?? 0}` },
  {
    label: "验证IC",
    value: props.modelStatus.validation_ic === null ? "-" : props.modelStatus.validation_ic?.toFixed(4),
  },
]);
</script>

<template>
  <section class="panel status-panel">
    <div class="table-header">
      <div>
        <div class="section-title">运行状态</div>
      </div>
      <div class="status-badge">{{ modelStatus.status || "待命" }}</div>
    </div>

    <div class="status-sections">
      <div class="status-section">
        <div class="status-section-title">核心状态</div>
        <div class="status-grid status-grid-primary">
          <div v-for="item in headlineItems" :key="item.label" class="status-item strong-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>

      <div class="status-section">
        <div class="status-section-title">数据覆盖</div>
        <div class="status-grid status-grid-secondary">
          <div v-for="item in detailItems" :key="item.label" class="status-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="status-meta-block">
      <div class="status-section-title">更新时间</div>
      <div class="status-meta-inline">
        <span v-if="modelStatus.last_sync_at">最近同步：{{ modelStatus.last_sync_at }}</span>
        <span>最近训练：{{ modelStatus.last_train_at || "暂无" }}</span>
        <span v-if="modelStatus.next_action">下一步：{{ modelStatus.next_action }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.status-grid {
  display: grid;
  gap: 10px 18px;
}

.status-sections {
  display: grid;
  gap: 16px;
}

.status-section {
  display: grid;
  gap: 10px;
}

.status-section-title {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.status-grid-primary,
.status-grid-secondary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.status-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.status-item {
  padding: 2px 0 8px;
  min-height: 0;
}

.status-item span {
  display: block;
  color: var(--muted);
  font-size: 13px;
}

.status-item strong {
  display: block;
  margin-top: 4px;
  font-size: 0.98rem;
  line-height: 1.28;
}

.status-badge {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(22, 101, 52, 0.06);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.status-meta-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: var(--muted);
  font-size: 14px;
}

.status-meta-block {
  display: grid;
  gap: 8px;
  padding-top: 2px;
}

@media (max-width: 960px) {
  .status-grid-primary,
  .status-grid-secondary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .status-grid-primary,
  .status-grid-secondary {
    grid-template-columns: 1fr;
  }
}
</style>
