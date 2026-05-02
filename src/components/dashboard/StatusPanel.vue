<script setup>
defineProps({
  modelStatus: { type: Object, required: true },
});
</script>

<template>
  <section class="status-strip section-panel">
    <div class="panel">
      <div class="table-header">
        <div class="section-title">系统状态</div>
      </div>
      <div class="status-grid status-grid-wide">
        <div class="status-item">
          <span>配置数据源</span>
          <strong>{{ modelStatus.provider }}</strong>
        </div>
        <div v-if="modelStatus.active_data_provider" class="status-item">
          <span>实际使用</span>
          <strong>{{ modelStatus.active_data_provider }}</strong>
        </div>
        <div class="status-item">
          <span>股票池来源</span>
          <strong>{{ modelStatus.universe_source }}</strong>
        </div>
        <div class="status-item">
          <span>自定义股票</span>
          <strong>{{ modelStatus.custom_universe_size ?? 0 }}</strong>
        </div>
        <div class="status-item">
          <span>股票池规模</span>
          <strong>{{ modelStatus.universe_size }}</strong>
        </div>
        <div class="status-item">
          <span>本地K线</span>
          <strong>{{ modelStatus.total_bars }}</strong>
        </div>
        <div v-if="modelStatus.latest_model_name" class="status-item">
          <span>模型名称</span>
          <strong>{{ modelStatus.latest_model_name }}</strong>
        </div>
        <div v-if="modelStatus.validation_ic !== null" class="status-item">
          <span>验证IC</span>
          <strong>{{ modelStatus.validation_ic?.toFixed(4) }}</strong>
        </div>
      </div>
      <div class="status-meta-inline">
        <span>状态：{{ modelStatus.status }}</span>
        <span v-if="modelStatus.last_sync_at">最近同步：{{ modelStatus.last_sync_at }}</span>
        <span>最近训练：{{ modelStatus.last_train_at }}</span>
        <span>下次动作：{{ modelStatus.next_action }}</span>
      </div>
      <p class="status-note">说明：{{ modelStatus.notes }}</p>
    </div>
  </section>
</template>
