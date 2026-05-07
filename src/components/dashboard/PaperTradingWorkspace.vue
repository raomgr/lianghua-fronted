<script setup>
import { computed, defineAsyncComponent, ref } from "vue";

const PaperEquityChart = defineAsyncComponent(() => import("../charts/PaperEquityChart.vue"));

const props = defineProps({
  account: { type: Object, default: null },
  positions: { type: Array, default: () => [] },
  orders: { type: Array, default: () => [] },
  signals: { type: Array, default: () => [] },
  execution: { type: Object, default: null },
  preview: { type: Object, default: null },
  equityCurve: { type: Array, default: () => [] },
  rebalanceLogs: { type: Array, default: () => [] },
  riskEvents: { type: Array, default: () => [] },
  reports: { type: Array, default: () => [] },
  dailySettings: { type: Object, default: null },
  dailyRuns: { type: Array, default: () => [] },
  schedulerStatus: { type: Object, default: null },
  paperLatestFailedStep: { type: String, default: "" },
  paperTopN: { type: Number, default: 3 },
  paperCapitalFraction: { type: Number, default: 0.95 },
  paperMaxPositionWeight: { type: Number, default: 0.35 },
  paperMinCashBufferRatio: { type: Number, default: 0.05 },
  paperMaxTurnoverRatio: { type: Number, default: 1.0 },
  paperStopLossPct: { type: Number, default: 0.1 },
  paperTakeProfitPct: { type: Number, default: 0.2 },
  paperFillRatio: { type: Number, default: 1.0 },
  paperMaxDrawdownLimit: { type: Number, default: 0.18 },
  paperMaxEquityChangeLimit: { type: Number, default: 0.04 },
  paperInitialCash: { type: Number, default: 1_000_000 },
  paperLoading: { type: Boolean, default: false },
  paperResetting: { type: Boolean, default: false },
  paperPreviewing: { type: Boolean, default: false },
  paperRejectingPreview: { type: Boolean, default: false },
  paperRetryingOrderId: { type: Number, default: null },
  paperCancellingOrderId: { type: Number, default: null },
  paperSavingDailySettings: { type: Boolean, default: false },
  paperRunningDailyCycle: { type: Boolean, default: false },
  paperRerunningDailyStep: { type: String, default: "" },
  paperRebalancing: { type: Boolean, default: false },
  paperMessage: { type: String, default: "" },
});

defineEmits([
  "update:paperTopN",
  "update:paperCapitalFraction",
  "update:paperMaxPositionWeight",
  "update:paperMinCashBufferRatio",
  "update:paperMaxTurnoverRatio",
  "update:paperStopLossPct",
  "update:paperTakeProfitPct",
  "update:paperFillRatio",
  "update:paperMaxDrawdownLimit",
  "update:paperMaxEquityChangeLimit",
  "update:paperInitialCash",
  "preview",
  "reject-preview",
  "retry-order",
  "cancel-order",
  "save-daily-settings",
  "run-daily-cycle",
  "rerun-daily-step",
  "rerun-latest-failed-step",
  "update:daily-settings-field",
  "rebalance",
  "reset",
]);

function formatPct(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatSignedQuantity(value) {
  const number = Number(value || 0);
  return `${number > 0 ? "+" : ""}${number}`;
}

function actionLabel(action) {
  return (
    {
      entry: "新开仓",
      add: "加仓",
      trim: "减仓",
      exit: "退出",
      risk_exit: "风控退出",
      hold: "维持",
      watch: "观察",
    }[action] || action
  );
}

function severityLabel(level) {
  return (
    {
      info: "提示",
      warning: "预警",
      error: "阻断",
    }[level] || level
  );
}

function compactText(value) {
  const text = String(value || "");
  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
}

function canRerunStep(step) {
  return ["sync", "train", "rebalance"].includes(String(step || ""));
}

function stepStatusLabel(status) {
  return (
    {
      success: "成功",
      failed: "失败",
      blocked: "阻断",
    }[status] || status
  );
}

function firstFailedStep(row) {
  return (row?.steps || []).find((item) => item?.status === "failed" && canRerunStep(item?.step))?.step || "";
}

function formatDuration(durationMs) {
  const value = Number(durationMs || 0);
  if (value < 1000) {
    return `${value}ms`;
  }
  return `${(value / 1000).toFixed(2)}s`;
}

const expandedDailyRunId = ref(null);
const dailyRunStatusFilter = ref("all");
const dailyRunStepFilter = ref("all");
const dailyRunKeyword = ref("");
const reportTypeFilter = ref("all");
const reportKeyword = ref("");
const riskSeverityFilter = ref("all");
const riskEventTypeFilter = ref("all");
const riskKeyword = ref("");

function toggleDailyRunDetails(id) {
  expandedDailyRunId.value = expandedDailyRunId.value === id ? null : id;
}

const filteredDailyRuns = computed(() => {
  const keyword = dailyRunKeyword.value.trim().toLowerCase();
  return (props.dailyRuns || []).filter((row) => {
    const statusMatches = dailyRunStatusFilter.value === "all" || row.status === dailyRunStatusFilter.value;
    const stepMatches =
      dailyRunStepFilter.value === "all" ||
      (row.steps || []).some((item) => String(item.step || "") === dailyRunStepFilter.value);
    if (!statusMatches || !stepMatches) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const haystack = [
      row.run_date,
      row.created_at,
      row.status,
      row.note,
      ...(row.steps || []).flatMap((item) => [item.step, item.status, item.message, item.error_type]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(keyword);
  });
});

const filteredRiskEvents = computed(() => {
  const keyword = riskKeyword.value.trim().toLowerCase();
  return (props.riskEvents || []).filter((row) => {
    const severityMatches = riskSeverityFilter.value === "all" || String(row.severity || "") === riskSeverityFilter.value;
    const eventTypeMatches = riskEventTypeFilter.value === "all" || String(row.event_type || "") === riskEventTypeFilter.value;
    if (!severityMatches || !eventTypeMatches) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const haystack = [
      row.title,
      row.created_at,
      row.event_type,
      row.severity,
      row.note,
      row.details?.reason,
      row.details?.error,
      ...(row.details?.warnings || []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(keyword);
  });
});

const filteredReports = computed(() => {
  const keyword = reportKeyword.value.trim().toLowerCase();
  return (props.reports || []).filter((row) => {
    const typeMatches = reportTypeFilter.value === "all" || String(row.report_type || "") === reportTypeFilter.value;
    if (!typeMatches) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const haystack = [
      row.title,
      row.created_at,
      row.report_type,
      row.note,
      row.summary?.cycle_status,
      row.summary?.trigger_source,
      row.summary?.execution?.orders_created,
      row.summary?.execution?.effective_fill_ratio,
      ...(row.summary?.steps || []).flatMap((item) => [item.step, item.status, item.message, item.error_type]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(keyword);
  });
});
</script>

<template>
  <section class="panel section-panel">
    <div class="table-header">
      <div class="section-title">Paper Trading</div>
      <span v-if="paperMessage" class="subtle-caption">{{ paperMessage }}</span>
    </div>

    <section class="chart-card chart-embedded">
      <div class="chart-frame">
        <PaperEquityChart :points="equityCurve" />
      </div>
    </section>

    <div class="insight-grid balanced-grid-two">
      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">执行参数与风控</div>
        </div>
        <div class="paper-form-grid">
          <label>
            <span>信号只数</span>
            <el-input-number
              size="large"
              :model-value="paperTopN"
              :min="1"
              :max="10"
              controls-position="right"
              @update:model-value="$emit('update:paperTopN', Number($event ?? 0))"
            />
          </label>
          <label>
            <span>资金使用率</span>
            <el-input-number
              size="large"
              :model-value="paperCapitalFraction"
              :min="0.1"
              :max="1"
              :step="0.05"
              controls-position="right"
              @update:model-value="$emit('update:paperCapitalFraction', Number($event ?? 0))"
            />
          </label>
          <label>
            <span>单票上限</span>
            <el-input-number
              size="large"
              :model-value="paperMaxPositionWeight"
              :min="0.05"
              :max="1"
              :step="0.05"
              controls-position="right"
              @update:model-value="$emit('update:paperMaxPositionWeight', Number($event ?? 0))"
            />
          </label>
          <label>
            <span>最低现金缓冲</span>
            <el-input-number
              size="large"
              :model-value="paperMinCashBufferRatio"
              :min="0"
              :max="0.8"
              :step="0.01"
              controls-position="right"
              @update:model-value="$emit('update:paperMinCashBufferRatio', Number($event ?? 0))"
            />
          </label>
          <label>
            <span>最大换手倍数</span>
            <el-input-number
              size="large"
              :model-value="paperMaxTurnoverRatio"
              :min="0.1"
              :max="2"
              :step="0.1"
              controls-position="right"
              @update:model-value="$emit('update:paperMaxTurnoverRatio', Number($event ?? 0))"
            />
          </label>
          <label>
            <span>止损阈值</span>
            <el-input-number
              size="large"
              :model-value="paperStopLossPct"
              :min="0"
              :max="0.5"
              :step="0.01"
              controls-position="right"
              @update:model-value="$emit('update:paperStopLossPct', Number($event ?? 0))"
            />
          </label>
          <label>
            <span>止盈阈值</span>
            <el-input-number
              size="large"
              :model-value="paperTakeProfitPct"
              :min="0"
              :max="1"
              :step="0.01"
              controls-position="right"
              @update:model-value="$emit('update:paperTakeProfitPct', Number($event ?? 0))"
            />
          </label>
          <label>
            <span>成交率模拟</span>
            <el-input-number
              size="large"
              :model-value="paperFillRatio"
              :min="0"
              :max="1"
              :step="0.05"
              controls-position="right"
              @update:model-value="$emit('update:paperFillRatio', Number($event ?? 0))"
            />
          </label>
          <label>
            <span>最大回撤阈值</span>
            <el-input-number
              size="large"
              :model-value="paperMaxDrawdownLimit"
              :min="0.01"
              :max="0.8"
              :step="0.01"
              controls-position="right"
              @update:model-value="$emit('update:paperMaxDrawdownLimit', Number($event ?? 0))"
            />
          </label>
          <label>
            <span>最近权益跌幅阈值</span>
            <el-input-number
              size="large"
              :model-value="paperMaxEquityChangeLimit"
              :min="0.01"
              :max="0.5"
              :step="0.01"
              controls-position="right"
              @update:model-value="$emit('update:paperMaxEquityChangeLimit', Number($event ?? 0))"
            />
          </label>
          <label>
            <span>重置本金</span>
            <el-input-number
              size="large"
              :model-value="paperInitialCash"
              :min="10000"
              :step="10000"
              controls-position="right"
              @update:model-value="$emit('update:paperInitialCash', Number($event ?? 0))"
            />
          </label>
        </div>
        <div class="hero-actions compact-actions">
          <button class="secondary-button" :disabled="paperPreviewing" @click="$emit('preview')">
            {{ paperPreviewing ? "预览中..." : "预览调仓" }}
          </button>
          <button class="secondary-button" :disabled="paperRejectingPreview || !preview?.plan_id" @click="$emit('reject-preview')">
            {{ paperRejectingPreview ? "放弃中..." : "放弃计划" }}
          </button>
          <button class="primary-button" :disabled="paperRebalancing || !preview || preview?.summary?.blocked" @click="$emit('rebalance')">
            {{ paperRebalancing ? "执行中..." : "确认执行" }}
          </button>
          <button class="secondary-button" :disabled="paperResetting" @click="$emit('reset')">
            {{ paperResetting ? "重置中..." : "重置账户" }}
          </button>
        </div>
        <div v-if="preview?.summary" class="status-meta">
          <span>计划单 #{{ preview.plan_id }}</span>
          <span v-if="preview.created_at">生成于 {{ preview.created_at }}</span>
          <span>预计买入 {{ formatCurrency(preview.summary.planned_buy_notional) }}</span>
          <span>预计卖出 {{ formatCurrency(preview.summary.planned_sell_notional) }}</span>
          <span>预计换手 {{ preview.summary.turnover_ratio.toFixed(2) }}</span>
          <span>执行后现金 {{ formatCurrency(preview.summary.estimated_cash_after) }}</span>
          <span>预计持仓 {{ preview.summary.estimated_position_count_after }} 只</span>
          <span>模拟成交率 {{ formatPct(preview.config.fill_ratio) }}</span>
          <span>峰值权益 {{ formatCurrency(preview.summary.peak_equity) }}</span>
          <span>当前回撤 {{ formatPct(preview.summary.current_drawdown) }}</span>
          <span>最近权益变化 {{ formatPct(preview.summary.latest_equity_change) }}</span>
          <span v-if="preview.summary.blocked_by_risk">组合风控已阻断</span>
          <span v-if="preview.summary.forced_exit_count > 0">风控退出 {{ preview.summary.forced_exit_count }} 只</span>
        </div>
        <p v-for="warning in preview?.summary?.warnings || []" :key="warning" class="status-note">{{ warning }}</p>
      </section>

      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">账户概览</div>
        </div>
        <div v-if="account" class="model-summary-grid compact-grid paper-account-grid">
          <div>
            <span>账户权益</span>
            <strong>{{ formatCurrency(account.equity) }}</strong>
          </div>
          <div>
            <span>可用现金</span>
            <strong>{{ formatCurrency(account.cash) }}</strong>
          </div>
          <div>
            <span>持仓市值</span>
            <strong>{{ formatCurrency(account.market_value) }}</strong>
          </div>
          <div>
            <span>累计收益</span>
            <strong :class="{ positive: account.total_return >= 0, negative: account.total_return < 0 }">{{ formatPct(account.total_return) }}</strong>
          </div>
          <div>
            <span>累计盈亏</span>
            <strong :class="{ positive: account.total_pnl >= 0, negative: account.total_pnl < 0 }">{{ formatCurrency(account.total_pnl) }}</strong>
          </div>
          <div>
            <span>持仓数量</span>
            <strong>{{ account.position_count }}</strong>
          </div>
          <div>
            <span>峰值权益</span>
            <strong>{{ formatCurrency(account.peak_equity) }}</strong>
          </div>
          <div>
            <span>当前回撤</span>
            <strong :class="{ negative: account.current_drawdown > 0.08 }">{{ formatPct(account.current_drawdown) }}</strong>
          </div>
          <div>
            <span>最近权益变化</span>
            <strong :class="{ negative: account.latest_equity_change < 0, positive: account.latest_equity_change >= 0 }">{{ formatPct(account.latest_equity_change) }}</strong>
          </div>
        </div>
        <div v-if="execution" class="status-meta-inline">
          <span>本次成交 {{ execution.orders_created }} 笔</span>
          <span>目标持仓 {{ execution.top_n }} 只</span>
          <span>资金使用率 {{ (Number(execution.capital_fraction || 0) * 100).toFixed(0) }}%</span>
          <span>止损 {{ formatPct(execution.stop_loss_pct) }}</span>
          <span>止盈 {{ formatPct(execution.take_profit_pct) }}</span>
          <span>成交率 {{ formatPct(execution.fill_ratio) }}</span>
          <span>实得成交率 {{ formatPct(execution.effective_fill_ratio) }}</span>
          <span>全成 {{ execution.filled_orders }} / 部成 {{ execution.partial_orders }} / 未成 {{ execution.cancelled_orders }}</span>
        </div>
      </section>
    </div>

    <div class="insight-grid balanced-grid-two">
      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">每日运行</div>
        </div>
        <div class="paper-form-grid">
          <label>
            <span>计划时间</span>
            <el-time-select
              size="large"
              :model-value="dailySettings?.run_time || '15:10'"
              start="09:30"
              step="00:10"
              end="23:30"
              placeholder="选择时间"
              @update:model-value="$emit('update:daily-settings-field', { key: 'run_time', value: $event })"
            />
          </label>
          <label>
            <span>启用日更</span>
            <el-select
              size="large"
              :model-value="dailySettings?.enabled ?? false"
              placeholder="选择状态"
              @update:model-value="$emit('update:daily-settings-field', { key: 'enabled', value: $event })"
            >
              <el-option :value="true" label="启用" />
              <el-option :value="false" label="停用" />
            </el-select>
          </label>
          <label>
            <span>自动同步</span>
            <el-select
              size="large"
              :model-value="dailySettings?.auto_sync ?? true"
              placeholder="选择状态"
              @update:model-value="$emit('update:daily-settings-field', { key: 'auto_sync', value: $event })"
            >
              <el-option :value="true" label="开启" />
              <el-option :value="false" label="关闭" />
            </el-select>
          </label>
          <label>
            <span>自动训练</span>
            <el-select
              size="large"
              :model-value="dailySettings?.auto_train ?? true"
              placeholder="选择状态"
              @update:model-value="$emit('update:daily-settings-field', { key: 'auto_train', value: $event })"
            >
              <el-option :value="true" label="开启" />
              <el-option :value="false" label="关闭" />
            </el-select>
          </label>
          <label>
            <span>自动调仓</span>
            <el-select
              size="large"
              :model-value="dailySettings?.auto_rebalance ?? true"
              placeholder="选择状态"
              @update:model-value="$emit('update:daily-settings-field', { key: 'auto_rebalance', value: $event })"
            >
              <el-option :value="true" label="开启" />
              <el-option :value="false" label="关闭" />
            </el-select>
          </label>
        </div>
        <div class="hero-actions compact-actions">
          <button class="secondary-button" :disabled="paperSavingDailySettings" @click="$emit('save-daily-settings')">
            {{ paperSavingDailySettings ? "保存中..." : "保存日更配置" }}
          </button>
          <button class="primary-button" :disabled="paperRunningDailyCycle" @click="$emit('run-daily-cycle')">
            {{ paperRunningDailyCycle ? "运行中..." : "立即执行日更" }}
          </button>
          <button
            v-if="paperLatestFailedStep"
            class="secondary-button"
            :disabled="!!paperRerunningDailyStep"
            @click="$emit('rerun-latest-failed-step')"
          >
            {{ paperRerunningDailyStep ? `补跑${paperRerunningDailyStep}中...` : `重跑失败步骤 ${paperLatestFailedStep}` }}
          </button>
        </div>
        <div v-if="dailySettings || schedulerStatus" class="paper-summary-strip">
          <span v-if="dailySettings">
            日更{{ dailySettings.enabled ? "已启用" : "已停用" }} · {{ dailySettings.run_time }}
          </span>
          <span v-if="dailySettings">
            同步{{ dailySettings.auto_sync ? "开" : "关" }} / 训练{{ dailySettings.auto_train ? "开" : "关" }} / 调仓{{ dailySettings.auto_rebalance ? "开" : "关" }}
          </span>
          <span v-if="schedulerStatus">
            调度{{ schedulerStatus.loop_running ? "运行中" : "未运行" }}
          </span>
          <span v-if="schedulerStatus?.last_outcome">最近结果 {{ schedulerStatus.last_outcome }}</span>
          <span v-if="schedulerStatus?.next_run_at">下次 {{ schedulerStatus.next_run_at }}</span>
          <span v-if="schedulerStatus?.next_retry_at">下次重试 {{ schedulerStatus.next_retry_at }}</span>
          <span v-if="schedulerStatus?.retry_attempt">重试 {{ schedulerStatus.retry_attempt }}/{{ schedulerStatus.max_retry_attempts }}</span>
          <span v-if="dailySettings?.updated_at">配置更新 {{ dailySettings.updated_at }}</span>
        </div>
        <p v-if="schedulerStatus?.note" class="status-note">{{ schedulerStatus.note }}</p>
        <p v-if="!paperLatestFailedStep" class="subtle-caption">当前没有失败步骤需要补跑。</p>
      </section>

      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">最近日更运行</div>
          <span class="subtle-caption">命中 {{ filteredDailyRuns.length }} / {{ dailyRuns.length }}</span>
        </div>
        <div class="paper-filter-grid">
          <label>
            <span>状态筛选</span>
            <el-select v-model="dailyRunStatusFilter" size="large" placeholder="全部">
              <el-option value="all" label="全部" />
              <el-option value="success" label="成功" />
              <el-option value="partial" label="部分告警" />
              <el-option value="failed" label="失败" />
            </el-select>
          </label>
          <label>
            <span>步骤筛选</span>
            <el-select v-model="dailyRunStepFilter" size="large" placeholder="全部">
              <el-option value="all" label="全部" />
              <el-option value="sync" label="sync" />
              <el-option value="train" label="train" />
              <el-option value="rebalance" label="rebalance" />
            </el-select>
          </label>
          <label>
            <span>关键词搜索</span>
            <el-input v-model="dailyRunKeyword" size="large" placeholder="搜索备注、报错、步骤名" clearable />
          </label>
        </div>
        <div class="card-scroll">
          <div class="history-list">
            <div v-for="row in filteredDailyRuns" :key="`daily-${row.id}`" class="history-row model-run-row">
              <div>
                <strong>{{ row.run_date }}</strong>
                <p class="subtle-caption">{{ row.created_at }} · {{ row.status }}</p>
              </div>
              <div>
                <strong>{{ row.steps.length }} 个步骤</strong>
                <p class="subtle-caption">{{ compactText(row.steps.map((item) => `${item.step}:${item.status}`).join(' / ')) }}</p>
              </div>
              <div>
                <strong>{{ compactText(row.note || "无备注") }}</strong>
                <p class="subtle-caption">{{ compactText(row.steps.map((item) => item.message).join('；')) }}</p>
              </div>
              <div class="table-actions">
                <button class="mini-button mini-button-muted" @click="toggleDailyRunDetails(row.id)">
                  {{ expandedDailyRunId === row.id ? "收起详情" : "查看详情" }}
                </button>
                <button
                  v-for="step in row.steps.filter((item) => item.status === 'failed' && canRerunStep(item.step))"
                  :key="`rerun-${row.id}-${step.step}`"
                  class="mini-button"
                  :disabled="paperRerunningDailyStep === step.step"
                  @click="$emit('rerun-daily-step', step.step)"
                >
                  {{ paperRerunningDailyStep === step.step ? `补跑${step.step}中...` : `补跑 ${step.step}` }}
                </button>
              </div>
              <div v-if="expandedDailyRunId === row.id" class="history-list">
                <div
                  v-for="step in row.steps"
                  :key="`step-${row.id}-${step.step}-${step.started_at}`"
                  class="history-row model-run-row"
                >
                  <div>
                    <strong>{{ step.step }}</strong>
                    <p class="subtle-caption">{{ stepStatusLabel(step.status) }}<span v-if="step.error_type"> · {{ step.error_type }}</span></p>
                  </div>
                  <div>
                    <strong>{{ formatDuration(step.duration_ms) }}</strong>
                    <p class="subtle-caption">{{ step.started_at }} -> {{ step.finished_at || "-" }}</p>
                  </div>
                  <div>
                    <strong>{{ compactText(step.message) }}</strong>
                    <p class="subtle-caption">步骤明细</p>
                  </div>
                </div>
                <p v-if="!row.steps.length" class="subtle-caption">本次没有执行任何步骤。</p>
                <p v-if="firstFailedStep(row)" class="subtle-caption">首个失败步骤：{{ firstFailedStep(row) }}</p>
              </div>
            </div>
            <p v-if="!filteredDailyRuns.length" class="subtle-caption">当前筛选条件下没有命中的日更运行记录。</p>
          </div>
        </div>
      </section>
    </div>

    <div class="detail-grid balanced-grid-two">
      <section class="panel compact-panel equal-card equal-card-large">
        <div class="table-header">
          <div class="section-title">调仓前后对比</div>
        </div>
        <div class="card-scroll">
          <div v-if="preview?.holdings?.length" class="history-list">
            <div v-for="row in preview.holdings" :key="`holding-${row.symbol}`" class="history-row model-run-row">
              <div>
                <strong>{{ row.symbol }} {{ row.name }}</strong>
                <p class="subtle-caption">{{ actionLabel(row.action) }} · {{ row.reason }}</p>
              </div>
              <div>
                <strong :class="{ positive: row.delta_quantity > 0, negative: row.delta_quantity < 0 }">{{ formatSignedQuantity(row.delta_quantity) }} 股</strong>
                <p class="subtle-caption">当前 {{ row.current_quantity }} -> 目标 {{ row.target_quantity }}</p>
              </div>
              <div>
                <strong>{{ formatCurrency(row.current_value) }} -> {{ formatCurrency(row.target_value) }}</strong>
                <p class="subtle-caption">
                  权重 {{ formatPct(row.weight_before) }} -> {{ formatPct(row.weight_after) }}
                  <span v-if="row.unrealized_pnl_pct !== null"> · 浮盈 {{ formatPct(row.unrealized_pnl_pct) }}</span>
                </p>
              </div>
            </div>
          </div>
          <div v-else class="history-list">
            <div v-for="row in signals" :key="`sig-${row.symbol}-${row.rank}`" class="history-row model-run-row">
              <div>
                <strong>#{{ row.rank }} {{ row.symbol }}</strong>
                <p class="subtle-caption">{{ row.symbol }} {{ row.name }}</p>
              </div>
              <div>
                <strong>{{ (Number(row.predicted_return_5d || 0) * 100).toFixed(2) }}%</strong>
                <p class="subtle-caption">Alpha Score {{ Number(row.score || 0).toFixed(3) }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="panel compact-panel equal-card equal-card-large">
        <div class="table-header">
          <div class="section-title">计划订单与当前持仓</div>
        </div>
        <div class="card-scroll">
          <div class="history-list">
            <div v-if="preview?.orders?.length" v-for="row in preview.orders" :key="`plan-${row.side}-${row.symbol}`" class="history-row model-run-row">
              <div>
                <strong :class="{ positive: row.side === 'sell', negative: row.side === 'buy' }">{{ row.side.toUpperCase() }}</strong>
                <p class="subtle-caption">{{ row.symbol }} {{ row.name }}</p>
              </div>
              <div>
                <strong>{{ row.planned_quantity }} 股</strong>
                <p class="subtle-caption">当前 {{ row.current_quantity }} -> 目标 {{ row.target_quantity }}</p>
              </div>
              <div>
                <strong>{{ formatCurrency(row.notional) }}</strong>
                <p class="subtle-caption">{{ row.reason }}</p>
              </div>
            </div>
          <div v-else v-for="row in positions" :key="`pos-${row.symbol}`" class="history-row model-run-row">
              <div>
                <strong>{{ row.symbol }} {{ row.name }}</strong>
                <p class="subtle-caption">
                  持仓 {{ row.quantity }} 股 · 可卖 {{ row.sellable_quantity }} 股
                  <span v-if="row.buy_locked_quantity > 0"> · T+1 锁定 {{ row.buy_locked_quantity }} 股</span>
                </p>
              </div>
              <div>
                <strong>{{ formatCurrency(row.market_value) }}</strong>
                <p class="subtle-caption" :class="{ positive: row.unrealized_pnl >= 0, negative: row.unrealized_pnl < 0 }">
                  浮盈 {{ formatCurrency(row.unrealized_pnl) }} / {{ formatPct(row.unrealized_pnl_pct) }}
                </p>
              </div>
            </div>
          </div>
          <div class="history-list section-panel">
            <div v-for="row in rebalanceLogs" :key="`rb-${row.id}`" class="history-row model-run-row">
              <div>
                <strong>{{ row.created_at }}</strong>
                <p class="subtle-caption">{{ row.target_symbols.join(' / ') }}</p>
              </div>
              <div>
                <strong>{{ row.orders_created }} 笔</strong>
                <p class="subtle-caption">换手 {{ row.turnover_ratio.toFixed(2) }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="panel compact-panel section-panel">
      <div class="table-header">
        <div class="section-title">最近成交</div>
      </div>
      <div class="card-scroll">
        <div class="history-list">
          <div v-for="row in orders" :key="`ord-${row.id}`" class="history-row model-run-row">
            <div>
              <strong :class="{ positive: row.side === 'sell', negative: row.side === 'buy' }">{{ row.side.toUpperCase() }}</strong>
              <p class="subtle-caption">{{ row.created_at }} · {{ row.status }}</p>
            </div>
            <div>
              <strong>{{ row.symbol }} {{ row.name }}</strong>
              <p class="subtle-caption">
                计划 {{ row.quantity }} 股 · 成交 {{ row.filled_quantity }} 股 · 剩余 {{ row.remaining_quantity }} 股
              </p>
            </div>
            <div>
              <strong>{{ formatCurrency(row.notional) }}</strong>
              <p class="subtle-caption">{{ row.note || row.source }} · 成交率 {{ formatPct(row.fill_ratio) }}</p>
            </div>
            <div v-if="row.remaining_quantity > 0 && ['partial', 'cancelled'].includes(row.status)" class="table-actions">
              <button class="mini-button" :disabled="paperRetryingOrderId === row.id" @click="$emit('retry-order', row.id)">
                {{ paperRetryingOrderId === row.id ? "重试中..." : "重试余量" }}
              </button>
              <button class="mini-button mini-button-muted" :disabled="paperCancellingOrderId === row.id" @click="$emit('cancel-order', row.id)">
                {{ paperCancellingOrderId === row.id ? "关闭中..." : "关闭余量" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="detail-grid balanced-grid-two">
      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">执行日报</div>
          <span class="subtle-caption">命中 {{ filteredReports.length }} / {{ reports.length }}</span>
        </div>
        <div class="paper-filter-grid">
          <label>
            <span>类型筛选</span>
            <el-select v-model="reportTypeFilter" size="large" placeholder="全部">
              <el-option value="all" label="全部" />
              <el-option value="reset" label="reset" />
              <el-option value="rebalance" label="rebalance" />
              <el-option value="retry" label="retry" />
              <el-option value="cancel" label="cancel" />
              <el-option value="reject" label="reject" />
              <el-option value="daily-cycle" label="daily-cycle" />
            </el-select>
          </label>
          <label>
            <span>关键词搜索</span>
            <el-input v-model="reportKeyword" size="large" placeholder="搜索日报标题、步骤、备注" clearable />
          </label>
        </div>
        <div class="card-scroll">
          <div class="history-list">
            <div v-for="row in filteredReports" :key="`report-${row.id}`" class="history-row model-run-row">
              <div>
                <strong>{{ row.title }}</strong>
                <p class="subtle-caption">{{ row.created_at }} · {{ row.report_type }}</p>
              </div>
              <div>
                <strong>{{ formatCurrency(row.summary.equity) }}</strong>
                <p class="subtle-caption">
                  现金 {{ formatCurrency(row.summary.cash) }} · 收益 {{ formatPct(row.summary.total_return) }}
                </p>
              </div>
              <div>
                <strong>{{ row.summary.position_count || 0 }} 只持仓</strong>
                <p class="subtle-caption">
                  {{
                    row.summary.execution
                      ? `成交 ${row.summary.execution.orders_created || 0} 笔 / 实得成交率 ${formatPct(row.summary.execution.effective_fill_ratio || 0)}`
                      : compactText(row.note || "无附加执行信息")
                  }}
                </p>
              </div>
            </div>
            <p v-if="!filteredReports.length" class="subtle-caption">当前筛选条件下没有命中的执行日报。</p>
          </div>
        </div>
      </section>

      <section class="panel compact-panel equal-card">
        <div class="table-header">
          <div class="section-title">风控事件</div>
          <span class="subtle-caption">命中 {{ filteredRiskEvents.length }} / {{ riskEvents.length }}</span>
        </div>
        <div class="paper-filter-grid">
          <label>
            <span>级别筛选</span>
            <el-select v-model="riskSeverityFilter" size="large" placeholder="全部">
              <el-option value="all" label="全部" />
              <el-option value="info" label="提示" />
              <el-option value="warning" label="预警" />
              <el-option value="error" label="阻断" />
            </el-select>
          </label>
          <label>
            <span>事件筛选</span>
            <el-select v-model="riskEventTypeFilter" size="large" placeholder="全部">
              <el-option value="all" label="全部" />
              <el-option value="preview_blocked" label="preview_blocked" />
              <el-option value="preview_warning" label="preview_warning" />
              <el-option value="daily_sync_failed" label="daily_sync_failed" />
              <el-option value="daily_train_failed" label="daily_train_failed" />
              <el-option value="daily_rebalance_failed" label="daily_rebalance_failed" />
              <el-option value="daily_rebalance_blocked" label="daily_rebalance_blocked" />
              <el-option value="scheduler_failed" label="scheduler_failed" />
              <el-option value="scheduler_retry_scheduled" label="scheduler_retry_scheduled" />
              <el-option value="scheduler_retry_exhausted" label="scheduler_retry_exhausted" />
              <el-option value="scheduler_completed" label="scheduler_completed" />
            </el-select>
          </label>
          <label>
            <span>关键词搜索</span>
            <el-input v-model="riskKeyword" size="large" placeholder="搜索事件名、报错、说明" clearable />
          </label>
        </div>
        <div class="card-scroll">
          <div class="history-list">
            <div v-for="row in filteredRiskEvents" :key="`risk-${row.id}`" class="history-row model-run-row">
              <div>
                <strong>{{ row.title }}</strong>
                <p class="subtle-caption">{{ row.created_at }} · {{ severityLabel(row.severity) }}</p>
              </div>
              <div>
                <strong>{{ row.event_type }}</strong>
                <p class="subtle-caption">
                  {{
                    row.details?.warnings?.length
                      ? compactText(row.details.warnings.join("；"))
                      : compactText(row.details?.error || row.note || "无补充说明")
                  }}
                </p>
              </div>
            </div>
            <p v-if="!filteredRiskEvents.length" class="subtle-caption">当前筛选条件下没有命中的风控事件。</p>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
