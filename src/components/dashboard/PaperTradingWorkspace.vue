<script setup>
import { computed, defineAsyncComponent, ref } from "vue";
import { InfoFilled } from "@element-plus/icons-vue";

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

const emit = defineEmits([
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

const paperParamFields = [
  { key: "paperTopN", label: "信号只数", min: 1, max: 10, step: 1, help: "每次调仓最多采纳前几只信号。" },
  { key: "paperCapitalFraction", label: "资金使用率", min: 0.1, max: 1, step: 0.05, help: "账户权益中计划投入调仓的比例。" },
  { key: "paperMaxPositionWeight", label: "单票上限", min: 0.05, max: 1, step: 0.05, help: "单只股票在组合中的最大目标权重。" },
  { key: "paperMinCashBufferRatio", label: "最低现金缓冲", min: 0, max: 0.8, step: 0.01, help: "执行后至少保留的现金比例。" },
  { key: "paperMaxTurnoverRatio", label: "最大换手倍数", min: 0.1, max: 2, step: 0.1, help: "限制单次调仓的换手强度。" },
  { key: "paperStopLossPct", label: "止损阈值", min: 0, max: 0.5, step: 0.01, help: "单票亏损达到该比例时触发退出。" },
  { key: "paperTakeProfitPct", label: "止盈阈值", min: 0, max: 1, step: 0.01, help: "单票盈利达到该比例时触发止盈退出。" },
  { key: "paperFillRatio", label: "成交率模拟", min: 0, max: 1, step: 0.05, help: "模拟订单能够真实成交的比例。" },
  { key: "paperMaxDrawdownLimit", label: "最大回撤阈值", min: 0.01, max: 0.8, step: 0.01, help: "组合回撤超过该值时阻断调仓。" },
  { key: "paperMaxEquityChangeLimit", label: "最近权益跌幅阈值", min: 0.01, max: 0.5, step: 0.01, help: "最近一次权益变化跌破该值时阻断调仓。" },
  { key: "paperInitialCash", label: "重置本金", min: 10000, max: undefined, step: 10000, help: "重置账户时使用的起始资金。" },
];

function paperParamValue(key) {
  return {
    paperTopN: props.paperTopN,
    paperCapitalFraction: props.paperCapitalFraction,
    paperMaxPositionWeight: props.paperMaxPositionWeight,
    paperMinCashBufferRatio: props.paperMinCashBufferRatio,
    paperMaxTurnoverRatio: props.paperMaxTurnoverRatio,
    paperStopLossPct: props.paperStopLossPct,
    paperTakeProfitPct: props.paperTakeProfitPct,
    paperFillRatio: props.paperFillRatio,
    paperMaxDrawdownLimit: props.paperMaxDrawdownLimit,
    paperMaxEquityChangeLimit: props.paperMaxEquityChangeLimit,
    paperInitialCash: props.paperInitialCash,
  }[key];
}

function updatePaperParam(key, value) {
  const nextValue = Number(value ?? 0);
  const eventMap = {
    paperTopN: "update:paperTopN",
    paperCapitalFraction: "update:paperCapitalFraction",
    paperMaxPositionWeight: "update:paperMaxPositionWeight",
    paperMinCashBufferRatio: "update:paperMinCashBufferRatio",
    paperMaxTurnoverRatio: "update:paperMaxTurnoverRatio",
    paperStopLossPct: "update:paperStopLossPct",
    paperTakeProfitPct: "update:paperTakeProfitPct",
    paperFillRatio: "update:paperFillRatio",
    paperMaxDrawdownLimit: "update:paperMaxDrawdownLimit",
    paperMaxEquityChangeLimit: "update:paperMaxEquityChangeLimit",
    paperInitialCash: "update:paperInitialCash",
  };
  emit(eventMap[key], nextValue);
}

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

function sectionTip(text) {
  return text;
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

const expandedDailyRunIds = ref([]);
const dailyRunStatusFilter = ref("all");
const dailyRunStepFilter = ref("all");
const dailyRunKeyword = ref("");
const reportTypeFilter = ref("all");
const reportKeyword = ref("");
const riskSeverityFilter = ref("all");
const riskEventTypeFilter = ref("all");
const riskKeyword = ref("");

function toggleDailyRunDetails(id) {
  expandedDailyRunIds.value = expandedDailyRunIds.value[0] === id ? [] : [id];
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
  <section class="panel section-panel paper-workspace">
    <div class="table-header">
      <div class="paper-title-row">
        <div class="section-title">Paper Trading</div>
        <el-tooltip effect="light" placement="right" :content="sectionTip('这里是模拟交易工作台：先看账户和参数，再看调仓预览、成交、日更记录和风控记录。')">
          <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
        </el-tooltip>
      </div>
      <span v-if="paperMessage" class="subtle-caption">{{ paperMessage }}</span>
    </div>

    <section class="chart-card chart-embedded">
      <div class="chart-frame">
        <PaperEquityChart :points="equityCurve" />
      </div>
    </section>

    <section class="panel compact-panel section-panel">
      <div class="table-header">
        <div class="paper-title-row">
          <div class="section-title">账户与持仓</div>
          <el-tooltip effect="light" placement="right" :content="sectionTip('先看账户整体快照，再看当前实际持仓；这两块放在一起更适合日常检查账户状态。')">
            <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>
      </div>

      <div class="paper-subsection">
        <div class="paper-subsection-head">
          <div class="paper-subsection-title">
            <h3>账户概览</h3>
            <el-tooltip effect="light" placement="right" :content="sectionTip('这里是账户整体快照，主要看权益、现金、收益和回撤。')">
              <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>
        <div v-if="account" class="paper-record-table-wrap">
          <el-descriptions :column="3" border class="paper-overview-descriptions">
            <el-descriptions-item label="账户权益">{{ formatCurrency(account.equity) }}</el-descriptions-item>
            <el-descriptions-item label="可用现金">{{ formatCurrency(account.cash) }}</el-descriptions-item>
            <el-descriptions-item label="持仓市值">{{ formatCurrency(account.market_value) }}</el-descriptions-item>
            <el-descriptions-item label="累计收益">
              <span :class="{ positive: account.total_return >= 0, negative: account.total_return < 0 }">{{ formatPct(account.total_return) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="累计盈亏">
              <span :class="{ positive: account.total_pnl >= 0, negative: account.total_pnl < 0 }">{{ formatCurrency(account.total_pnl) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="持仓数量">{{ account.position_count }}</el-descriptions-item>
            <el-descriptions-item label="峰值权益">{{ formatCurrency(account.peak_equity) }}</el-descriptions-item>
            <el-descriptions-item label="当前回撤">
              <span :class="{ negative: account.current_drawdown > 0.08 }">{{ formatPct(account.current_drawdown) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="最近权益变化">
              <span :class="{ negative: account.latest_equity_change < 0, positive: account.latest_equity_change >= 0 }">{{ formatPct(account.latest_equity_change) }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <el-empty v-else description="还没有账户数据。" :image-size="72" />
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
      </div>

      <div class="paper-subsection">
        <div class="paper-subsection-head">
          <div class="paper-subsection-title">
            <h3>当前持仓</h3>
            <el-tooltip effect="light" placement="right" :content="sectionTip('这里是当前实际持仓，重点看可卖股数、锁定股数、持仓市值和浮盈亏。')">
              <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>
        <div v-if="positions.length" class="paper-record-table-wrap">
          <el-table :data="positions" stripe class="paper-record-table">
            <el-table-column prop="symbol" label="代码" min-width="110" />
            <el-table-column prop="name" label="名称" min-width="130" />
            <el-table-column prop="quantity" label="持仓股数" min-width="110" />
            <el-table-column prop="sellable_quantity" label="可卖股数" min-width="110" />
            <el-table-column label="锁定股数" min-width="110">
              <template #default="{ row }">
                {{ row.buy_locked_quantity || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="持仓市值" min-width="140">
              <template #default="{ row }">
                {{ formatCurrency(row.market_value) }}
              </template>
            </el-table-column>
            <el-table-column label="浮盈亏" min-width="180">
              <template #default="{ row }">
                <span :class="{ positive: row.unrealized_pnl >= 0, negative: row.unrealized_pnl < 0 }">
                  {{ formatCurrency(row.unrealized_pnl) }} / {{ formatPct(row.unrealized_pnl_pct) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-else description="当前没有持仓。" :image-size="72" />
      </div>
    </section>

    <section class="panel compact-panel section-panel">
      <div class="table-header">
        <div class="paper-title-row">
          <div class="section-title">执行参数与风控</div>
          <el-tooltip effect="light" placement="right" :content="sectionTip('这一组参数决定模拟调仓如何下单、如何限制仓位和风险阈值。')">
            <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>
      </div>
      <div class="paper-record-table-wrap paper-config-table-wrap">
        <el-table :data="paperParamFields" stripe class="paper-record-table paper-config-table">
          <el-table-column prop="label" label="参数" min-width="160" />
          <el-table-column label="当前值" min-width="220">
            <template #default="{ row }">
              <el-input-number
                size="large"
                :model-value="paperParamValue(row.key)"
                :min="row.min"
                :max="row.max"
                :step="row.step"
                controls-position="right"
                @update:model-value="updatePaperParam(row.key, $event)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="help" label="说明" min-width="320" show-overflow-tooltip />
        </el-table>
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

    <section class="panel compact-panel section-panel">
      <div class="table-header">
        <div class="paper-title-row">
          <div class="section-title">最近成交</div>
          <el-tooltip effect="light" placement="right" :content="sectionTip('这里只看最近生成的成交记录，包括方向、数量、金额和余量处理。')">
            <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>
      </div>
      <div v-if="orders.length" class="paper-record-table-wrap">
        <el-table :data="orders" stripe class="paper-record-table">
          <el-table-column label="成交时间" min-width="200">
            <template #default="{ row }">
              <span>{{ row.created_at }}</span>
              <p class="subtle-caption">来源 {{ row.source || "-" }}</p>
            </template>
          </el-table-column>
          <el-table-column label="方向 / 状态" min-width="150">
            <template #default="{ row }">
              <span :class="{ positive: row.side === 'sell', negative: row.side === 'buy' }">{{ row.side === 'sell' ? "卖出" : "买入" }}</span>
              <p class="subtle-caption">{{ row.status === 'failed' ? "失败" : "成功" }}</p>
            </template>
          </el-table-column>
          <el-table-column label="股票" min-width="200">
            <template #default="{ row }">
              <span>{{ row.symbol }} {{ row.name }}</span>
              <p class="subtle-caption">成交率 {{ formatPct(row.fill_ratio) }}</p>
            </template>
          </el-table-column>
          <el-table-column label="数量" min-width="220">
            <template #default="{ row }">
              <span>计划 {{ row.quantity }} 股</span>
              <p class="subtle-caption">成交 {{ row.filled_quantity }} 股 · 剩余 {{ row.remaining_quantity }} 股</p>
            </template>
          </el-table-column>
          <el-table-column label="金额 / 备注" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ formatCurrency(row.notional) }}</span>
              <p class="subtle-caption">{{ row.note || "无备注" }}</p>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="160" fixed="right">
            <template #default="{ row }">
              <div
                v-if="row.remaining_quantity > 0 && ['partial', 'cancelled'].includes(row.status)"
                class="paper-daily-actions"
              >
                <button class="mini-button" :disabled="paperRetryingOrderId === row.id" @click="$emit('retry-order', row.id)">
                  {{ paperRetryingOrderId === row.id ? "重试中..." : "重试余量" }}
                </button>
                <button
                  class="mini-button mini-button-muted"
                  :disabled="paperCancellingOrderId === row.id"
                  @click="$emit('cancel-order', row.id)"
                >
                  {{ paperCancellingOrderId === row.id ? "关闭中..." : "关闭余量" }}
                </button>
              </div>
              <span v-else class="subtle-caption">无可操作项</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-else description="还没有成交记录。" :image-size="72" />
    </section>

    <div class="paper-daily-stack section-panel">
      <section class="panel compact-panel paper-daily-panel">
        <div class="table-header">
          <div class="paper-title-row">
            <div class="section-title">每日运行</div>
            <el-tooltip effect="light" placement="right" :content="sectionTip('配置每天何时自动同步、训练、调仓，也可以在这里手动触发日更。')">
              <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>
        <div class="paper-form-grid paper-daily-settings-grid">
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

      <section class="panel compact-panel paper-daily-panel">
        <div class="table-header">
          <div class="paper-title-row">
            <div class="section-title">最近日更运行</div>
            <el-tooltip effect="light" placement="right" :content="sectionTip('这里记录最近几次日更任务的执行结果，可按状态、步骤和关键词筛选。')">
              <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
          <span class="subtle-caption">命中 {{ filteredDailyRuns.length }} / {{ dailyRuns.length }}</span>
        </div>
        <div class="paper-filter-grid paper-daily-filter-grid">
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
          <div class="paper-daily-table-wrap">
            <el-table
              v-if="filteredDailyRuns.length"
              :data="filteredDailyRuns"
              stripe
              row-key="id"
              class="paper-daily-table"
              :expand-row-keys="expandedDailyRunIds"
            >
              <el-table-column type="expand" width="52">
                <template #default="{ row }">
                  <div class="paper-daily-expand-shell">
                    <div class="paper-daily-expand-meta">
                      <span v-if="firstFailedStep(row)">首个失败步骤：{{ firstFailedStep(row) }}</span>
                      <span v-else>本次没有失败步骤。</span>
                      <span>步骤数 {{ row.steps.length }}</span>
                    </div>
                    <el-table v-if="row.steps.length" :data="row.steps" stripe class="paper-daily-step-table">
                      <el-table-column prop="step" label="步骤" min-width="110" />
                      <el-table-column label="状态" min-width="120">
                        <template #default="{ row: step }">
                          {{ stepStatusLabel(step.status) }}<span v-if="step.error_type"> · {{ step.error_type }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column label="耗时" min-width="100">
                        <template #default="{ row: step }">
                          {{ formatDuration(step.duration_ms) }}
                        </template>
                      </el-table-column>
                      <el-table-column label="时间区间" min-width="220">
                        <template #default="{ row: step }">
                          {{ step.started_at }} -> {{ step.finished_at || "-" }}
                        </template>
                      </el-table-column>
                      <el-table-column label="明细" min-width="320" show-overflow-tooltip>
                        <template #default="{ row: step }">
                          {{ compactText(step.message) }}
                        </template>
                      </el-table-column>
                    </el-table>
                    <p v-else class="subtle-caption">本次没有执行任何步骤。</p>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="运行日期" min-width="150">
                <template #default="{ row }">
                  <span>{{ row.run_date }}</span>
                  <p class="subtle-caption">{{ row.created_at }}</p>
                </template>
              </el-table-column>
              <el-table-column label="状态 / 步骤" min-width="280">
                <template #default="{ row }">
                  <span>{{ row.status }}</span>
                  <p class="subtle-caption">{{ compactText(row.steps.map((item) => `${item.step}:${item.status}`).join(" / ")) }}</p>
                </template>
              </el-table-column>
              <el-table-column label="备注" min-width="500" show-overflow-tooltip>
                <template #default="{ row }">
                  <span>{{ compactText(row.note || "无备注") }}</span>
                  <p class="subtle-caption">{{ compactText(row.steps.map((item) => item.message).join("；")) }}</p>
                </template>
              </el-table-column>
              <el-table-column label="操作" min-width="120" fixed="right">
                <template #default="{ row }">
                  <div class="paper-daily-actions">
                    <button class="mini-button mini-button-muted" @click="toggleDailyRunDetails(row.id)">
                      {{ expandedDailyRunIds[0] === row.id ? "收起详情" : "查看详情" }}
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
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
        <el-empty v-if="!filteredDailyRuns.length" description="当前筛选条件下没有命中的日更运行记录。" :image-size="72" />
      </section>
    </div>

    <div class="paper-record-stack section-panel">
      <section class="panel compact-panel">
        <div class="table-header">
          <div class="paper-title-row">
            <div class="section-title">{{ preview?.holdings?.length ? "目标持仓调整表" : "今日信号排序" }}</div>
            <el-tooltip
              effect="light"
              placement="right"
              :content="sectionTip(preview?.holdings?.length ? '对比当前持仓和目标持仓，重点看哪些股票要加仓、减仓或退出。' : '展示当前模型的信号排序，越靠前通常优先级越高。')"
            >
              <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>
        <div v-if="preview?.holdings?.length" class="paper-record-table-wrap">
          <el-table :data="preview.holdings" stripe class="paper-record-table">
            <el-table-column prop="symbol" label="代码" min-width="110" />
            <el-table-column prop="name" label="名称" min-width="130" />
            <el-table-column label="动作" min-width="110">
              <template #default="{ row }">
                {{ actionLabel(row.action) }}
              </template>
            </el-table-column>
            <el-table-column prop="current_quantity" label="当前股数" min-width="110" />
            <el-table-column prop="target_quantity" label="目标股数" min-width="110" />
            <el-table-column label="变动股数" min-width="110">
              <template #default="{ row }">
                <span :class="{ positive: row.delta_quantity > 0, negative: row.delta_quantity < 0 }">{{ formatSignedQuantity(row.delta_quantity) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="权重变化" min-width="180">
              <template #default="{ row }">
                {{ formatPct(row.weight_before) }} -> {{ formatPct(row.weight_after) }}
              </template>
            </el-table-column>
            <el-table-column label="说明" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                {{ compactText(`${row.reason}${row.unrealized_pnl_pct !== null ? `；浮盈 ${formatPct(row.unrealized_pnl_pct)}` : ""}`) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-else-if="signals.length" class="paper-record-table-wrap">
          <el-table :data="signals" stripe class="paper-record-table">
            <el-table-column prop="rank" label="排名" min-width="80" />
            <el-table-column prop="symbol" label="代码" min-width="110" />
            <el-table-column prop="name" label="名称" min-width="140" />
            <el-table-column label="预期5日收益" min-width="120">
              <template #default="{ row }">
                {{ (Number(row.predicted_return_5d || 0) * 100).toFixed(2) }}%
              </template>
            </el-table-column>
            <el-table-column label="Alpha Score" min-width="120">
              <template #default="{ row }">
                {{ Number(row.score || 0).toFixed(3) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-else description="还没有可展示的调仓或信号数据。" :image-size="72" />
      </section>

      <section v-if="preview?.orders?.length" class="panel compact-panel">
        <div class="table-header">
          <div class="paper-title-row">
            <div class="section-title">计划下单清单</div>
            <el-tooltip effect="light" placement="right" :content="sectionTip('这里是本次调仓计划下的订单，重点看方向、股数和预计金额。')">
              <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>
        <div class="paper-record-table-wrap">
          <el-table :data="preview.orders" stripe class="paper-record-table">
            <el-table-column label="方向" min-width="90">
              <template #default="{ row }">
                {{ row.side === "buy" ? "买入" : "卖出" }}
              </template>
            </el-table-column>
            <el-table-column prop="symbol" label="代码" min-width="110" />
            <el-table-column prop="name" label="名称" min-width="130" />
            <el-table-column prop="planned_quantity" label="计划股数" min-width="110" />
            <el-table-column label="当前 -> 目标" min-width="150">
              <template #default="{ row }">
                {{ row.current_quantity }} -> {{ row.target_quantity }}
              </template>
            </el-table-column>
            <el-table-column label="预计金额" min-width="140">
              <template #default="{ row }">
                {{ formatCurrency(row.notional) }}
              </template>
            </el-table-column>
            <el-table-column label="原因" min-width="240" show-overflow-tooltip>
              <template #default="{ row }">
                {{ compactText(row.reason) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section class="panel compact-panel">
        <div class="table-header">
          <div class="paper-title-row">
            <div class="section-title">最近调仓执行记录</div>
            <el-tooltip effect="light" placement="right" :content="sectionTip('这里只看已经执行过的调仓结果，用来回看当时调了哪些股票、下了几笔订单、换手多大。')">
              <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>
        <div v-if="rebalanceLogs.length" class="paper-record-table-wrap">
          <el-table :data="rebalanceLogs" stripe class="paper-record-table">
            <el-table-column prop="created_at" label="调仓时间" min-width="180" />
            <el-table-column label="目标股票" min-width="280" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.target_symbols.join(" / ") }}
              </template>
            </el-table-column>
            <el-table-column prop="orders_created" label="订单数" min-width="100" />
            <el-table-column label="换手率" min-width="100">
              <template #default="{ row }">
                {{ row.turnover_ratio.toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-else description="还没有调仓记录。" :image-size="72" />
      </section>
    </div>

    <div class="paper-log-stack section-panel">
      <section class="panel compact-panel">
        <div class="table-header">
          <div class="paper-title-row">
            <div class="section-title">执行日报</div>
            <el-tooltip effect="light" placement="right" :content="sectionTip('这里记录每次重置、调仓、重试或日更后的账户结果，用来快速回看执行结果。')">
              <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
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
        <div v-if="filteredReports.length" class="paper-record-table-wrap">
          <el-table :data="filteredReports" stripe class="paper-record-table">
            <el-table-column label="日报标题" min-width="220">
              <template #default="{ row }">
                <span>{{ row.title }}</span>
                <p class="subtle-caption">{{ row.created_at }} · {{ row.report_type }}</p>
              </template>
            </el-table-column>
            <el-table-column label="账户摘要" min-width="220">
              <template #default="{ row }">
                <span>{{ formatCurrency(row.summary.equity) }}</span>
                <p class="subtle-caption">现金 {{ formatCurrency(row.summary.cash) }} · 收益 {{ formatPct(row.summary.total_return) }}</p>
              </template>
            </el-table-column>
            <el-table-column label="执行结果" min-width="280">
              <template #default="{ row }">
                <span>{{ row.summary.position_count || 0 }} 只持仓</span>
                <p class="subtle-caption">
                  {{
                    row.summary.execution
                      ? `成交 ${row.summary.execution.orders_created || 0} 笔 / 实得成交率 ${formatPct(row.summary.execution.effective_fill_ratio || 0)}`
                      : compactText(row.note || "无附加执行信息")
                  }}
                </p>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-else description="当前筛选条件下没有命中的执行日报。" :image-size="72" />
      </section>

      <section class="panel compact-panel">
        <div class="table-header">
          <div class="paper-title-row">
            <div class="section-title">风控事件</div>
            <el-tooltip effect="light" placement="right" :content="sectionTip('这里记录所有预警、阻断和调度异常，主要用来查为什么某次调仓没有执行成功。')">
              <el-icon class="paper-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
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
        <div v-if="filteredRiskEvents.length" class="paper-record-table-wrap">
          <el-table :data="filteredRiskEvents" stripe class="paper-record-table">
            <el-table-column label="事件标题" min-width="220">
              <template #default="{ row }">
                <span>{{ row.title }}</span>
                <p class="subtle-caption">{{ row.created_at }} · {{ severityLabel(row.severity) }}</p>
              </template>
            </el-table-column>
            <el-table-column label="事件类型" min-width="180">
              <template #default="{ row }">
                <span>{{ row.event_type }}</span>
              </template>
            </el-table-column>
            <el-table-column label="说明" min-width="360" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="paper-record-text">
                  {{
                    row.details?.warnings?.length
                      ? compactText(row.details.warnings.join("；"))
                      : compactText(row.details?.error || row.note || "无补充说明")
                  }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-else description="当前筛选条件下没有命中的风控事件。" :image-size="72" />
      </section>
    </div>
  </section>
</template>
