<script setup>
import { computed } from "vue";

const props = defineProps({
  signalSummary: { type: Object, default: null },
  signalReview: { type: Object, default: null },
  signalActionItems: { type: Array, default: () => [] },
  signalTargetPositions: { type: Array, default: () => [] },
  signalTopCandidates: { type: Array, default: () => [] },
  signalHistory: { type: Array, default: () => [] },
  signalLoading: { type: Boolean, default: false },
  signalReviewing: { type: Boolean, default: false },
  signalReviewDraft: { type: String, default: "" },
  signalMessage: { type: String, default: "" },
});

const emit = defineEmits(["refresh", "save-review", "update:signalReviewDraft"]);

const reviewLabel = computed(() => {
  const value = props.signalReview?.status || "pending";
  if (value === "executed") {
    return "已执行";
  }
  if (value === "ignored") {
    return "已忽略";
  }
  return "待执行";
});

function actionBadgeClass(action) {
  if (action === "买入" || action === "加仓") {
    return "positive-fill";
  }
  if (action === "卖出" || action === "减仓") {
    return "negative-fill";
  }
  return "neutral-fill";
}

function reviewBadgeClass(status) {
  if (status === "executed") {
    return "positive-fill";
  }
  if (status === "ignored") {
    return "negative-fill";
  }
  return "neutral-fill";
}
</script>

<template>
  <section class="panel section-panel">
    <div class="table-header">
      <div>
        <div class="section-title">实盘信号中心</div>
        <p class="helper-text">
          远程服务负责生成信号和调仓建议，你在本地浏览器查看后，再用券商 APP 手动下单。
        </p>
      </div>
      <div class="history-actions">
        <div class="status-pill" :class="reviewBadgeClass(signalReview?.status)">
          当前状态：{{ reviewLabel }}
        </div>
        <button class="secondary-button" :disabled="signalLoading" @click="emit('refresh')">
          {{ signalLoading ? "刷新中..." : "刷新信号" }}
        </button>
      </div>
    </div>

    <div v-if="signalMessage" class="update-message signal-message">{{ signalMessage }}</div>

    <div v-if="signalSummary" class="metric-grid signal-metric-grid">
      <article class="metric-card">
        <div class="metric-label">信号生成时间</div>
        <div class="metric-value signal-metric-value">{{ signalSummary.generated_at || "-" }}</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">主模型</div>
        <div class="metric-value signal-metric-value">{{ signalSummary.model_name || "-" }}</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">目标持仓</div>
        <div class="metric-value">{{ signalSummary.target_position_count }}</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">平均预期 5 日收益</div>
        <div class="metric-value">{{ ((signalSummary.avg_predicted_return_5d || 0) * 100).toFixed(2) }}%</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">估算需处理笔数</div>
        <div class="metric-value">{{ signalSummary.estimated_turnover_count }}</div>
      </article>
    </div>

    <div v-if="signalSummary?.warnings?.length" class="signal-warning-list">
      <div v-for="(warning, index) in signalSummary.warnings" :key="`warning-${index}`" class="status-note">
        {{ warning }}
      </div>
    </div>

    <div class="detail-grid balanced-grid-two">
      <section class="panel compact-panel equal-card equal-card-large">
        <div class="table-header">
          <div class="section-title">今日建议动作</div>
          <div class="helper-text">按优先顺序给你列出买入、卖出、加减仓建议。</div>
        </div>
        <div class="card-scroll">
          <div v-if="signalActionItems.length" class="history-list">
            <div v-for="row in signalActionItems" :key="`action-${row.symbol}-${row.action}`" class="history-row model-run-row signal-action-row">
              <div class="signal-action-main">
                <div class="signal-action-top">
                  <strong>{{ row.symbol }}</strong>
                  <span>{{ row.name }}</span>
                </div>
                <div class="signal-action-meta">
                  <span class="detail-badge" :class="actionBadgeClass(row.action)">{{ row.action }}</span>
                  <span>目标 {{ row.target_quantity }} 股</span>
                  <span>当前 {{ row.current_quantity }} 股</span>
                  <span>排名 #{{ row.rank }}</span>
                  <span>预期 {{ (row.predicted_return_5d * 100).toFixed(2) }}%</span>
                </div>
                <div class="helper-text">{{ row.note }}</div>
              </div>
            </div>
          </div>
          <div v-else class="compact-empty">还没有可展示的调仓建议。</div>
        </div>
      </section>

      <section class="panel compact-panel equal-card equal-card-large">
        <div class="table-header">
          <div class="section-title">执行确认</div>
          <div class="helper-text">你用券商 APP 操作完后，在这里回写状态。</div>
        </div>

        <div class="model-summary-grid compact-grid signal-summary-grid">
          <div>
            <span>账户权益</span>
            <strong>{{ (signalSummary?.account_equity || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 }) }}</strong>
          </div>
          <div>
            <span>账户现金</span>
            <strong>{{ (signalSummary?.account_cash || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 }) }}</strong>
          </div>
          <div>
            <span>目标持仓权重</span>
            <strong>{{ ((signalSummary?.target_weight_per_position || 0) * 100).toFixed(1) }}%</strong>
          </div>
          <div>
            <span>资金使用比例</span>
            <strong>{{ ((signalSummary?.capital_fraction || 0) * 100).toFixed(1) }}%</strong>
          </div>
        </div>

        <label class="signal-review-box">
          <span>执行备注</span>
          <textarea
            class="universe-input signal-review-input"
            :value="signalReviewDraft"
            placeholder="比如：已在券商 APP 完成下单；或今天选择忽略，原因是临近节假日。"
            @input="emit('update:signalReviewDraft', $event.target.value)"
          />
        </label>

        <div class="hero-actions compact-actions signal-review-actions">
          <button class="primary-button" :disabled="signalReviewing" @click="emit('save-review', 'executed')">
            {{ signalReviewing ? "提交中..." : "标记为已执行" }}
          </button>
          <button class="secondary-button" :disabled="signalReviewing" @click="emit('save-review', 'ignored')">
            标记为已忽略
          </button>
          <button class="secondary-button" :disabled="signalReviewing" @click="emit('save-review', 'pending')">
            恢复待执行
          </button>
        </div>

        <div class="table-header signal-sub-header">
          <div class="section-title">目标组合</div>
          <div class="helper-text">这部分是系统当前最看好的目标持仓。</div>
        </div>
        <div class="card-scroll">
          <div v-if="signalTargetPositions.length" class="history-list">
            <div v-for="row in signalTargetPositions" :key="`target-${row.symbol}`" class="history-row model-run-row">
              <strong>{{ row.symbol }}</strong>
              <span>{{ row.name }}</span>
              <span>{{ ((row.target_weight || 0) * 100).toFixed(1) }}%</span>
              <span>{{ row.target_quantity }} 股</span>
            </div>
          </div>
          <div v-else class="compact-empty">当前没有目标组合数据。</div>
        </div>
      </section>
    </div>

    <div class="detail-grid balanced-grid-two">
      <section class="panel compact-panel equal-card equal-card-medium">
        <div class="table-header">
          <div class="section-title">候选信号</div>
          <div class="helper-text">保留更多候选，方便你人工择时和复核。</div>
        </div>
        <div class="card-scroll">
          <div v-if="signalTopCandidates.length" class="history-list">
            <div v-for="row in signalTopCandidates" :key="`candidate-${row.symbol}-${row.rank}`" class="history-row model-run-row">
              <strong>#{{ row.rank }} {{ row.symbol }}</strong>
              <span>{{ row.name }}</span>
              <span>{{ (row.predicted_return_5d * 100).toFixed(2) }}%</span>
              <span>Score {{ row.score.toFixed(3) }}</span>
            </div>
          </div>
          <div v-else class="compact-empty">还没有候选信号。</div>
        </div>
      </section>

      <section class="panel compact-panel equal-card equal-card-medium">
        <div class="table-header">
          <div class="section-title">最近信号历史</div>
          <div class="helper-text">你后面可以按这块回看“信号是否采纳”。</div>
        </div>
        <div class="card-scroll">
          <div v-if="signalHistory.length" class="history-list">
            <div v-for="row in signalHistory" :key="`history-${row.model_run_id}`" class="history-row model-run-row signal-history-row">
              <div class="signal-history-top">
                <strong>{{ row.generated_at }}</strong>
                <span class="detail-badge" :class="reviewBadgeClass(row.review_status)">
                  {{ row.review_status === "executed" ? "已执行" : row.review_status === "ignored" ? "已忽略" : "待执行" }}
                </span>
              </div>
              <div>{{ row.model_name }} · {{ row.top_symbols.join(" / ") }}</div>
              <div class="helper-text">
                平均预期 {{ (row.avg_predicted_return_5d * 100).toFixed(2) }}% · 最强 {{ (row.best_predicted_return_5d * 100).toFixed(2) }}%
              </div>
            </div>
          </div>
          <div v-else class="compact-empty">还没有历史信号记录。</div>
        </div>
      </section>
    </div>
  </section>
</template>
