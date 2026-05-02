<script setup>
defineProps({
  modelCompare: { type: Array, default: () => [] },
  modelDetail: { type: Object, default: null },
  walkForwardSummary: { type: Object, default: () => ({}) },
  modelRuns: { type: Array, default: () => [] },
});
</script>

<template>
  <section class="panel section-panel">
    <div class="table-header">
      <div class="section-title">模型工作区</div>
    </div>

    <div class="compare-grid model-compare-grid">
      <article
        v-for="item in modelCompare"
        :key="`${item.model_name}-${item.run_at}`"
        class="compare-card"
        :class="{ champion: item.is_champion }"
      >
        <div class="compare-card-header">
          <strong>{{ item.model_name }}</strong>
          <span v-if="item.is_champion" class="compare-chip">当前主模型</span>
        </div>
        <p class="helper-text">{{ item.note }}</p>
        <div class="model-summary-grid compare-metrics">
          <div>
            <span>验证IC</span>
            <strong>{{ item.validation_ic.toFixed(4) }}</strong>
          </div>
          <div>
            <span>方向准确率</span>
            <strong>{{ (item.validation_directional_accuracy * 100).toFixed(1) }}%</strong>
          </div>
          <div>
            <span>滚动IC均值</span>
            <strong>{{ item.walk_forward_mean_ic.toFixed(4) }}</strong>
          </div>
          <div>
            <span>正IC占比</span>
            <strong>{{ (item.walk_forward_positive_ic_ratio * 100).toFixed(1) }}%</strong>
          </div>
        </div>
        <div class="compare-footer">
          <span>多空平均收益 {{ (item.walk_forward_mean_long_short_return * 100).toFixed(2) }}%</span>
          <span>{{ item.run_at }}</span>
        </div>
      </article>
    </div>

    <div class="detail-grid balanced-grid-two">
      <section class="panel compact-panel equal-card equal-card-large">
        <div class="section-title">模型画像</div>
        <div v-if="modelDetail" class="card-scroll">
          <div class="model-summary-grid compact-grid">
            <div>
              <span>模型</span>
              <strong>{{ modelDetail.model_name }}</strong>
            </div>
            <div>
              <span>训练样本</span>
              <strong>{{ modelDetail.train_rows }}</strong>
            </div>
            <div>
              <span>验证样本</span>
              <strong>{{ modelDetail.validation_rows }}</strong>
            </div>
            <div>
              <span>验证IC</span>
              <strong>{{ modelDetail.validation_ic.toFixed(4) }}</strong>
            </div>
          </div>
          <div class="model-summary-grid compact-grid">
            <div>
              <span>滚动窗口数</span>
              <strong>{{ walkForwardSummary.walk_forward_windows ?? 0 }}</strong>
            </div>
            <div>
              <span>滚动IC均值</span>
              <strong>{{ (walkForwardSummary.walk_forward_mean_ic ?? 0).toFixed(4) }}</strong>
            </div>
            <div>
              <span>正IC占比</span>
              <strong>{{ (((walkForwardSummary.walk_forward_positive_ic_ratio ?? 0) * 100)).toFixed(1) }}%</strong>
            </div>
            <div>
              <span>多空平均收益</span>
              <strong>{{ (((walkForwardSummary.walk_forward_mean_long_short_return ?? 0) * 100)).toFixed(2) }}%</strong>
            </div>
          </div>
          <div class="feature-list">
            <div v-for="item in modelDetail.top_features" :key="item.feature" class="feature-row">
              <span>{{ item.feature }}</span>
              <div class="feature-bar-track">
                <div class="feature-bar-fill" :style="{ width: `${Math.max(item.importance * 100, 4)}%` }" />
              </div>
              <strong>{{ item.importance.toFixed(3) }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="panel compact-panel equal-card equal-card-large">
        <div class="section-title">最近训练</div>
        <div class="card-scroll">
          <div class="history-list">
            <div v-for="row in modelRuns" :key="`${row.model_name}-${row.run_at}`" class="history-row model-run-row">
              <span>{{ row.run_at }}</span>
              <strong>{{ row.model_name }}</strong>
              <span>IC {{ row.validation_ic.toFixed(4) }} / Acc {{ (row.validation_directional_accuracy * 100).toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
