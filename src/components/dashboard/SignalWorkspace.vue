<script setup>
import { computed, ref } from "vue";

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
  signalExecutionItemsDraft: { type: Array, default: () => [] },
  signalExecutionSummary: { type: Object, default: () => ({}) },
  signalMessage: { type: String, default: "" },
});

const emit = defineEmits(["refresh", "save-review", "update:signalReviewDraft", "update:signalExecutionItem"]);
const copyMessage = ref("");
const expandedHistoryIds = ref([]);

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

const actionableItems = computed(() =>
  props.signalActionItems.filter((item) => item.action !== "持有"),
);

const sellSideItems = computed(() =>
  actionableItems.value.filter((item) => item.action === "卖出" || item.action === "减仓"),
);

const buySideItems = computed(() =>
  actionableItems.value.filter((item) => item.action === "买入" || item.action === "加仓"),
);

const holdItems = computed(() =>
  props.signalActionItems.filter((item) => item.action === "持有"),
);

const operationChecklist = computed(() => {
  const lines = [];
  if (sellSideItems.value.length) {
    lines.push("先处理卖出/减仓：");
    sellSideItems.value.forEach((row, index) => {
      lines.push(
        `${index + 1}. ${row.action} ${row.symbol} ${row.name}，当前 ${row.current_quantity} 股，目标 ${row.target_quantity} 股，预期 ${(row.predicted_return_5d * 100).toFixed(2)}%`,
      );
    });
  }
  if (buySideItems.value.length) {
    if (lines.length) {
      lines.push("");
    }
    lines.push("再处理买入/加仓：");
    buySideItems.value.forEach((row, index) => {
      lines.push(
        `${index + 1}. ${row.action} ${row.symbol} ${row.name}，当前 ${row.current_quantity} 股，目标 ${row.target_quantity} 股，预期 ${(row.predicted_return_5d * 100).toFixed(2)}%`,
      );
    });
  }
  if (!lines.length) {
    lines.push("当前没有需要执行的买卖动作，可继续观察。");
  }
  return lines.join("\n");
});

const topWarning = computed(() => props.signalSummary?.warnings?.[0] || "");

async function copyChecklist() {
  copyMessage.value = "";
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(operationChecklist.value);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = operationChecklist.value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    copyMessage.value = "已复制操作清单，可直接对照券商 APP 下单。";
  } catch (error) {
    copyMessage.value = "复制失败，请手动复制页面中的操作清单。";
  }
}

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

function toggleHistoryDetails(modelRunId) {
  if (expandedHistoryIds.value.includes(modelRunId)) {
    expandedHistoryIds.value = expandedHistoryIds.value.filter((item) => item !== modelRunId);
    return;
  }
  expandedHistoryIds.value = [...expandedHistoryIds.value, modelRunId];
}

function isHistoryExpanded(modelRunId) {
  return expandedHistoryIds.value.includes(modelRunId);
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
    <div v-if="copyMessage" class="update-message signal-message">{{ copyMessage }}</div>

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

    <div v-if="signalSummary" class="detail-grid balanced-grid-two signal-priority-grid">
      <section class="panel compact-panel equal-card signal-priority-card">
        <div class="table-header signal-priority-header">
          <div>
            <div class="section-title">今日先做什么</div>
            <div class="helper-text">按“先卖后买”的顺序执行，避免资金占用和仓位错配。</div>
          </div>
          <div class="history-actions">
            <div class="status-pill">{{ actionableItems.length }} 笔待处理</div>
            <button class="secondary-button" type="button" @click="copyChecklist">
              复制下单清单
            </button>
          </div>
        </div>

        <div class="signal-priority-summary">
          <div class="summary-chip">
            <span>卖出 / 减仓</span>
            <strong>{{ sellSideItems.length }} 笔</strong>
          </div>
          <div class="summary-chip">
            <span>买入 / 加仓</span>
            <strong>{{ buySideItems.length }} 笔</strong>
          </div>
          <div class="summary-chip">
            <span>继续持有</span>
            <strong>{{ holdItems.length }} 只</strong>
          </div>
          <div class="summary-chip">
            <span>预计卖出金额</span>
            <strong>{{ sellSideItems.reduce((sum, item) => sum + Math.abs(item.delta_quantity || 0) * (item.last_price || 0), 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 }) }}</strong>
          </div>
          <div class="summary-chip">
            <span>预计买入金额</span>
            <strong>{{ buySideItems.reduce((sum, item) => sum + Math.max(item.delta_quantity || 0, 0) * (item.last_price || 0), 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 }) }}</strong>
          </div>
        </div>

        <div class="signal-checklist">
          <pre class="signal-checklist-text">{{ operationChecklist }}</pre>
        </div>
      </section>

      <section class="panel compact-panel equal-card signal-priority-card">
        <div class="table-header">
          <div>
            <div class="section-title">执行前确认</div>
            <div class="helper-text">先确认信号时间、现金、状态，再去券商端操作。</div>
          </div>
          <div class="status-pill" :class="reviewBadgeClass(signalReview?.status)">
            {{ reviewLabel }}
          </div>
        </div>

        <div class="signal-check-grid">
          <div class="factor-card">
            <span>信号交易日</span>
            <strong>{{ signalSummary.signal_trade_date || "-" }}</strong>
          </div>
          <div class="factor-card">
            <span>账户现金</span>
            <strong>{{ (signalSummary.account_cash || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 }) }}</strong>
          </div>
          <div class="factor-card">
            <span>目标仓位数</span>
            <strong>{{ signalSummary.target_position_count }}</strong>
          </div>
          <div class="factor-card">
            <span>模型状态</span>
            <strong>{{ signalSummary.model_name || "-" }}</strong>
          </div>
        </div>

        <div v-if="topWarning" class="status-note signal-priority-note">
          {{ topWarning }}
        </div>
      </section>
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
          <div v-if="actionableItems.length" class="history-list signal-group-list">
            <div class="signal-group">
              <div class="signal-group-header">
                <strong>先处理卖出 / 减仓</strong>
                <span>{{ sellSideItems.length }} 笔</span>
              </div>
              <div v-if="sellSideItems.length" class="history-list">
                <div v-for="row in sellSideItems" :key="`sell-${row.symbol}-${row.action}`" class="history-row model-run-row signal-action-row">
                  <div class="signal-action-main">
                    <div class="signal-action-top">
                      <strong>{{ row.symbol }}</strong>
                      <span>{{ row.name }}</span>
                    </div>
                    <div class="signal-action-meta">
                      <span class="detail-badge" :class="actionBadgeClass(row.action)">{{ row.action }}</span>
                      <span>当前 {{ row.current_quantity }} 股</span>
                      <span>目标 {{ row.target_quantity }} 股</span>
                      <span>减少 {{ Math.abs(row.delta_quantity) }} 股</span>
                      <span>现仓 {{ ((row.current_weight || 0) * 100).toFixed(1) }}%</span>
                    </div>
                    <div class="helper-text">{{ row.note }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="compact-empty compact-empty-inline">当前没有卖出或减仓动作。</div>
            </div>

            <div class="signal-group">
              <div class="signal-group-header">
                <strong>再处理买入 / 加仓</strong>
                <span>{{ buySideItems.length }} 笔</span>
              </div>
              <div v-if="buySideItems.length" class="history-list">
                <div v-for="row in buySideItems" :key="`buy-${row.symbol}-${row.action}`" class="history-row model-run-row signal-action-row">
                  <div class="signal-action-main">
                    <div class="signal-action-top">
                      <strong>{{ row.symbol }}</strong>
                      <span>{{ row.name }}</span>
                    </div>
                    <div class="signal-action-meta">
                      <span class="detail-badge" :class="actionBadgeClass(row.action)">{{ row.action }}</span>
                      <span>目标 {{ row.target_quantity }} 股</span>
                      <span>当前 {{ row.current_quantity }} 股</span>
                      <span>增加 {{ Math.max(row.delta_quantity, 0) }} 股</span>
                      <span>排名 #{{ row.rank }}</span>
                      <span>预期 {{ (row.predicted_return_5d * 100).toFixed(2) }}%</span>
                    </div>
                    <div class="helper-text">{{ row.note }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="compact-empty compact-empty-inline">当前没有买入或加仓动作。</div>
            </div>
          </div>
          <div v-else-if="signalActionItems.length" class="history-list">
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

        <div class="table-header signal-sub-header">
          <div class="section-title">真实成交回写</div>
          <div class="helper-text">下单完成后，把实际成交数量、成交价记进来，方便复盘。</div>
        </div>

        <div class="signal-execution-summary">
          <div class="summary-chip">
            <span>已回写笔数</span>
            <strong>{{ signalExecutionSummary.executedItemsCount || 0 }} / {{ signalExecutionSummary.itemsCount || 0 }}</strong>
          </div>
          <div class="summary-chip">
            <span>实际买入金额</span>
            <strong>{{ (signalExecutionSummary.executedBuyAmount || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 }) }}</strong>
          </div>
          <div class="summary-chip">
            <span>实际卖出金额</span>
            <strong>{{ (signalExecutionSummary.executedSellAmount || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 }) }}</strong>
          </div>
        </div>

        <div class="card-scroll signal-execution-scroll">
          <div v-if="signalExecutionItemsDraft.length" class="signal-execution-table">
            <div class="signal-execution-row signal-execution-head">
              <span>股票</span>
              <span>动作</span>
              <span>计划股数</span>
              <span>实际股数</span>
              <span>成交价</span>
              <span>备注</span>
            </div>
            <div v-for="(row, index) in signalExecutionItemsDraft" :key="`exec-${row.symbol}-${row.action}`" class="signal-execution-row">
              <strong>{{ row.symbol }} {{ row.name }}</strong>
              <span>
                <span class="detail-badge" :class="actionBadgeClass(row.action)">{{ row.action }}</span>
              </span>
              <span>{{ row.planned_quantity }}</span>
              <label>
                <input
                  class="signal-inline-input"
                  type="number"
                  min="0"
                  :value="row.executed_quantity"
                  @input="emit('update:signalExecutionItem', index, 'executed_quantity', $event.target.value)"
                />
              </label>
              <label>
                <input
                  class="signal-inline-input"
                  type="number"
                  min="0"
                  step="0.01"
                  :value="row.executed_price"
                  @input="emit('update:signalExecutionItem', index, 'executed_price', $event.target.value)"
                />
              </label>
              <label>
                <input
                  class="signal-inline-input"
                  type="text"
                  :value="row.note"
                  placeholder="比如：分两笔成交"
                  @input="emit('update:signalExecutionItem', index, 'note', $event.target.value)"
                />
              </label>
            </div>
          </div>
          <div v-else class="compact-empty">当前没有需要回写的执行动作。</div>
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
                <div class="history-actions">
                  <span class="detail-badge" :class="reviewBadgeClass(row.review_status)">
                    {{ row.review_status === "executed" ? "已执行" : row.review_status === "ignored" ? "已忽略" : "待执行" }}
                  </span>
                  <button
                    v-if="row.execution_items?.length"
                    class="secondary-button compact-action-button"
                    type="button"
                    @click="toggleHistoryDetails(row.model_run_id)"
                  >
                    {{ isHistoryExpanded(row.model_run_id) ? "收起明细" : "查看明细" }}
                  </button>
                </div>
              </div>
              <div>{{ row.model_name }} · {{ row.top_symbols.join(" / ") }}</div>
              <div class="helper-text">
                平均预期 {{ (row.avg_predicted_return_5d * 100).toFixed(2) }}% · 最强 {{ (row.best_predicted_return_5d * 100).toFixed(2) }}%
              </div>
              <div v-if="row.execution_summary?.items_count || row.review_performance?.executed_items_count" class="signal-history-summary">
                <span class="summary-chip">
                  <span>执行进度</span>
                  <strong>{{ row.execution_summary?.executed_items_count || 0 }} / {{ row.execution_summary?.items_count || 0 }}</strong>
                </span>
                <span class="summary-chip">
                  <span>实际买入</span>
                  <strong>{{ (row.execution_summary?.executed_buy_amount || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 }) }}</strong>
                </span>
                <span class="summary-chip">
                  <span>实际卖出</span>
                  <strong>{{ (row.execution_summary?.executed_sell_amount || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 }) }}</strong>
                </span>
              </div>
              <div
                v-if="row.review_performance?.priced_items_count"
                class="helper-text signal-history-review"
              >
                已跟踪 {{ row.review_performance.priced_items_count }} 笔成交，按动作方向折算后的后续表现
                {{ (row.review_performance.weighted_post_trade_move * 100).toFixed(2) }}%，
                覆盖金额 {{ (row.review_performance.tracked_notional || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 }) }}
              </div>
              <div
                v-else-if="row.review_status === 'executed' && row.review_performance?.executed_items_count"
                class="helper-text signal-history-review"
              >
                已记录真实成交，后续价格跟踪数据还在等待更新。
              </div>
              <div v-if="isHistoryExpanded(row.model_run_id) && row.execution_items?.length" class="signal-history-detail">
                <div class="signal-history-detail-head">
                  <span>股票 / 动作</span>
                  <span>成交</span>
                  <span>最新价</span>
                  <span>后续表现</span>
                </div>
                <div
                  v-for="item in row.execution_items"
                  :key="`history-item-${row.model_run_id}-${item.symbol}-${item.action}`"
                  class="signal-history-detail-row"
                >
                  <div>
                    <strong>{{ item.symbol }} {{ item.name }}</strong>
                    <div class="helper-text">
                      <span class="detail-badge" :class="actionBadgeClass(item.action)">{{ item.action }}</span>
                      计划 {{ item.planned_quantity }} 股
                    </div>
                  </div>
                  <div>
                    <strong>{{ item.executed_quantity }} 股</strong>
                    <div class="helper-text">成交价 {{ Number(item.executed_price || 0).toFixed(2) }}</div>
                  </div>
                  <div>
                    <strong>{{ item.tracked ? Number(item.latest_price || 0).toFixed(2) : "-" }}</strong>
                    <div class="helper-text">
                      {{ item.tracked ? `跟踪金额 ${Number(item.latest_value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}` : "等待最新价" }}
                    </div>
                  </div>
                  <div>
                    <strong :class="item.signed_return >= 0 ? 'positive-text' : 'negative-text'">
                      {{ item.tracked ? `${(Number(item.signed_return || 0) * 100).toFixed(2)}%` : "-" }}
                    </strong>
                    <div class="helper-text">
                      {{ item.tracked ? `方向收益 ${Number(item.signed_pnl || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}` : (item.note || "未形成可复盘价格") }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="compact-empty">还没有历史信号记录。</div>
        </div>
      </section>
    </div>
  </section>
</template>
