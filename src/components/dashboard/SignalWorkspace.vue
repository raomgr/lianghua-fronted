<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { InfoFilled } from "@element-plus/icons-vue";

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
  signalExecutionDeviation: { type: Object, default: () => ({}) },
  signalHistoryStats: { type: Object, default: () => ({}) },
  signalMessage: { type: String, default: "" },
});

const emit = defineEmits(["refresh", "save-review", "update:signalReviewDraft", "update:signalExecutionItem"]);

const copyMessage = ref("");
let copyMessageTimer = null;

function formatPercent(value, digits = 2) {
  return `${((Number(value) || 0) * 100).toFixed(digits)}%`;
}

function formatNumber(value, digits = 0) {
  return (Number(value) || 0).toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}

function formatTargetStocks(symbols = [], names = []) {
  return symbols
    .map((symbol, index) => {
      const name = names[index];
      return name ? `${symbol} ${name}` : symbol;
    })
    .join(" / ");
}

function buildTargetStockItems(symbols = [], names = [], prices = []) {
  return symbols.map((symbol, index) => ({
    symbol,
    name: names[index] || "",
    price: Number(prices[index] || 0),
  }));
}

function formatTargetStocksCompact(symbols = [], names = []) {
  const items = buildTargetStockItems(symbols, names);
  if (!items.length) {
    return "-";
  }
  if (items.length <= 2) {
    return items.map((item) => `${item.symbol} ${item.name}`.trim()).join(" · ");
  }
  return `${items
    .slice(0, 2)
    .map((item) => `${item.symbol} ${item.name}`.trim())
    .join(" · ")} 等 ${items.length} 只`;
}

function actionTagType(action) {
  if (action === "买入" || action === "加仓") {
    return "success";
  }
  if (action === "卖出" || action === "减仓") {
    return "danger";
  }
  return "info";
}

function reviewTagType(status) {
  if (status === "executed") {
    return "success";
  }
  if (status === "ignored") {
    return "danger";
  }
  return "info";
}

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

function isCurrentReviewStatus(status) {
  return (props.signalReview?.status || "pending") === status;
}

const reviewActionOptions = computed(() => {
  const currentStatus = props.signalReview?.status || "pending";
  const options = [
    { status: "executed", label: "标记为已执行", type: "primary", plain: false },
    { status: "ignored", label: "改为已忽略", type: "danger", plain: true },
    { status: "pending", label: "恢复待执行", type: "default", plain: true },
  ];
  return options.filter((option) => option.status !== currentStatus);
});

const reviewStatusHint = computed(() => {
  const currentStatus = props.signalReview?.status || "pending";
  if (currentStatus === "executed") {
    return "这次信号已记为执行完成，如录入有误再切换状态。";
  }
  if (currentStatus === "ignored") {
    return "这次信号已记为忽略；如果之后补做了，可以恢复待执行或改成已执行。";
  }
  return "先回写真实成交，再把这次信号标记成已执行或已忽略。";
});

function sectionTip(text) {
  return text;
}

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
  const rows = [];
  if (sellSideItems.value.length) {
    sellSideItems.value.forEach((row) => {
      rows.push(
        `${row.action} ${row.symbol} ${row.name}，当前 ${row.current_quantity} 股，目标 ${row.target_quantity} 股，预期 ${formatPercent(row.predicted_return_5d)}`,
      );
    });
  }
  if (buySideItems.value.length) {
    buySideItems.value.forEach((row) => {
      rows.push(
        `${row.action} ${row.symbol} ${row.name}，当前 ${row.current_quantity} 股，目标 ${row.target_quantity} 股，预期 ${formatPercent(row.predicted_return_5d)}`,
      );
    });
  }
  if (!rows.length) {
    rows.push("当前没有需要执行的买卖动作，可继续观察。");
  }
  return rows.map((row, index) => `${index + 1}. ${row}`).join("\n");
});

const visibleWarnings = computed(() =>
  (props.signalSummary?.warnings || []).filter(
    (warning) =>
      warning &&
      !warning.includes("Current version uses rule-based factor ranking") &&
      !warning.includes("这次信号还没有被你标记为已执行或已忽略。"),
  ),
);

const providerStatusMessage = computed(() => {
  const warnings = visibleWarnings.value;
  if (!warnings.length) {
    return "";
  }
  const merged = warnings.join(" ");
  if (merged.includes("mock-fallback") || merged.includes("tushare")) {
    return "当前使用的是降级数据源，真实数据源暂时不可用；你仍然可以查看信号、记录成交并继续复盘。";
  }
  return warnings[0];
});

const signalSummaryMetrics = computed(() => {
  if (!props.signalSummary) {
    return [];
  }
  return [
    { label: "信号生成时间", value: props.signalSummary.generated_at || "-" },
    { label: "主模型", value: props.signalSummary.model_name || "-" },
    { label: "目标持仓", value: `${props.signalSummary.target_position_count || 0}` },
    { label: "平均预期 5 日收益", value: formatPercent(props.signalSummary.avg_predicted_return_5d) },
    { label: "估算需处理笔数", value: `${props.signalSummary.estimated_turnover_count || 0}` },
  ];
});

const headlineMetrics = computed(() => {
  const items = signalSummaryMetrics.value;
  return items.slice(0, 3);
});

const supportingMetrics = computed(() => {
  const items = signalSummaryMetrics.value;
  return items.slice(3);
});

const preTradeChecks = computed(() => {
  if (!props.signalSummary) {
    return [];
  }
  return [
    { label: "信号交易日", value: props.signalSummary.signal_trade_date || "-" },
    { label: "账户现金", value: formatNumber(props.signalSummary.account_cash) },
    { label: "目标仓位数", value: `${props.signalSummary.target_position_count || 0}` },
    { label: "账户权益", value: formatNumber(props.signalSummary.account_equity) },
    { label: "单票目标权重", value: formatPercent(props.signalSummary.target_weight_per_position, 1) },
    { label: "资金使用比例", value: formatPercent(props.signalSummary.capital_fraction, 1) },
  ];
});

const prioritySummaryItems = computed(() => [
  { label: "待处理动作", value: `${actionableItems.value.length} 笔` },
  { label: "先卖出 / 减仓", value: `${sellSideItems.value.length} 笔` },
  { label: "再买入 / 加仓", value: `${buySideItems.value.length} 笔` },
  {
    label: "预计净买入",
    value: formatNumber(
      buySideItems.value.reduce(
        (sum, item) => sum + Math.max(item.delta_quantity || 0, 0) * (item.last_price || 0),
        0,
      ) -
        sellSideItems.value.reduce(
          (sum, item) => sum + Math.abs(item.delta_quantity || 0) * (item.last_price || 0),
          0,
        ),
    ),
  },
]);

const nextActionItems = computed(() => [
  ...sellSideItems.value.map((item) => ({
    ...item,
    phase: "先处理卖出 / 减仓",
  })),
  ...buySideItems.value.map((item) => ({
    ...item,
    phase: "再处理买入 / 加仓",
  })),
]);

const executionDeviationCards = computed(() => [
  { label: "执行完成度", value: formatPercent(props.signalExecutionDeviation.completionRate, 1) },
  { label: "计划金额", value: formatNumber(props.signalExecutionDeviation.totalPlannedNotional) },
  { label: "少执行金额", value: formatNumber(props.signalExecutionDeviation.underExecutedNotional) },
  { label: "未执行", value: `${props.signalExecutionDeviation.missedItems?.length || 0} 笔` },
  { label: "部分执行", value: `${props.signalExecutionDeviation.partialItems?.length || 0} 笔` },
  { label: "超额执行", value: `${props.signalExecutionDeviation.overfilledItems?.length || 0} 笔` },
]);

const executionSummaryCards = computed(() => [
  {
    label: "已回写笔数",
    value: `${props.signalExecutionSummary.executedItemsCount || 0} / ${props.signalExecutionSummary.itemsCount || 0}`,
  },
  { label: "实际买入金额", value: formatNumber(props.signalExecutionSummary.executedBuyAmount) },
  { label: "实际卖出金额", value: formatNumber(props.signalExecutionSummary.executedSellAmount) },
]);

const executionAlertSummary = computed(() => {
  const missed = props.signalExecutionDeviation.missedItems?.length || 0;
  const partial = props.signalExecutionDeviation.partialItems?.length || 0;
  const overfilled = props.signalExecutionDeviation.overfilledItems?.length || 0;
  return [
    { label: "未执行", value: `${missed} 笔`, tone: missed ? "warning" : "neutral" },
    { label: "部分执行", value: `${partial} 笔`, tone: partial ? "warning" : "neutral" },
    { label: "超额执行", value: `${overfilled} 笔`, tone: overfilled ? "danger" : "neutral" },
  ];
});

const executionAlertMessages = computed(() => {
  const messages = [];
  const missedItems = props.signalExecutionDeviation.missedItems || [];
  const partialItems = props.signalExecutionDeviation.partialItems || [];
  const overfilledItems = props.signalExecutionDeviation.overfilledItems || [];

  if (missedItems.length) {
    messages.push(`未执行：${missedItems.map((row) => `${row.symbol} ${row.name}`).join("、")}`);
  }
  if (partialItems.length) {
    messages.push(
      `部分执行：${partialItems
        .map((row) => `${row.symbol} ${row.name}（少 ${row.plannedQuantity - row.executedQuantity} 股）`)
        .join("、")}`,
    );
  }
  if (overfilledItems.length) {
    messages.push(
      `超额执行：${overfilledItems
        .map((row) => `${row.symbol} ${row.name}（多 ${row.executedQuantity - row.plannedQuantity} 股）`)
        .join("、")}`,
    );
  }
  return messages;
});

const historyOverviewCards = computed(() => [
  { label: "总信号数", value: `${props.signalHistoryStats.totalSignals || 0}` },
  {
    label: "已执行 / 采纳率",
    value: `${props.signalHistoryStats.executedSignals || 0} / ${formatPercent(props.signalHistoryStats.adoptionRate, 1)}`,
  },
  {
    label: "已忽略 / 待执行",
    value: `${props.signalHistoryStats.ignoredSignals || 0} / ${props.signalHistoryStats.pendingSignals || 0}`,
  },
  {
    label: "执行信号平均预期",
    value: formatPercent(props.signalHistoryStats.avgExpectedReturnExecuted),
  },
  { label: "累计实际买入", value: formatNumber(props.signalHistoryStats.executedBuyAmount) },
  { label: "累计实际卖出", value: formatNumber(props.signalHistoryStats.executedSellAmount) },
]);

const historyOverviewSummaryCards = computed(() => [
  { label: "已形成价格跟踪的信号", value: `${props.signalHistoryStats.trackedSignals || 0}` },
  { label: "覆盖成交金额", value: formatNumber(props.signalHistoryStats.totalTrackedNotional) },
  { label: "执行后整体跟随效果", value: formatPercent(props.signalHistoryStats.weightedFollowThrough) },
]);

async function copyChecklist() {
  if (copyMessageTimer) {
    clearTimeout(copyMessageTimer);
    copyMessageTimer = null;
  }
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
  } catch {
    copyMessage.value = "复制失败，请手动复制页面中的操作清单。";
  }
  copyMessageTimer = window.setTimeout(() => {
    copyMessage.value = "";
    copyMessageTimer = null;
  }, 3000);
}

onBeforeUnmount(() => {
  if (copyMessageTimer) {
    clearTimeout(copyMessageTimer);
  }
});
</script>

<template>
  <section class="panel section-panel signal-workspace signal-ep-workspace">
    <div class="signal-ep-header">
      <div>
        <div class="signal-ep-title-row">
          <div class="section-title">实盘信号中心</div>
          <el-tooltip
            effect="light"
            placement="right"
            :content="sectionTip('远程服务负责生成信号；你在这里查看、记录成交，再去券商 APP 手动下单。')"
          >
            <el-icon class="signal-ep-info-icon"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>
      </div>
      <div class="signal-ep-header-actions">
        <el-tag :type="reviewTagType(signalReview?.status)" effect="light" round>
          当前状态：{{ reviewLabel }}
        </el-tag>
        <el-button :loading="signalLoading" @click="emit('refresh')">刷新信号</el-button>
      </div>
    </div>

    <el-alert v-if="providerStatusMessage" :title="providerStatusMessage" type="warning" :closable="false" show-icon />
    <div v-if="signalMessage" class="signal-ep-flash-message">
      <el-tag type="info" effect="light" round>{{ signalMessage }}</el-tag>
    </div>
    <el-alert v-if="copyMessage" :title="copyMessage" type="success" :closable="false" show-icon />

    <div v-if="signalSummary" class="signal-ep-metrics">
      <div class="signal-ep-headline-metrics">
        <div v-for="metric in headlineMetrics" :key="metric.label" class="signal-ep-headline-item">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </div>
      </div>
      <div v-if="supportingMetrics.length" class="signal-ep-supporting-metrics">
        <div v-for="metric in supportingMetrics" :key="metric.label" class="signal-ep-supporting-item">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </div>
      </div>
    </div>

    <el-card v-if="signalSummary" shadow="never" class="signal-ep-panel signal-ep-compact-confirm">
      <template #header>
        <div class="signal-ep-card-header">
          <div>
            <div class="signal-ep-title-row">
              <div class="section-title">下单前快速确认</div>
              <el-tooltip
                effect="light"
                placement="right"
                :content="sectionTip('这里只保留今天真正需要核对的关键字段，避免在下单前重复看太多无关信息。')"
              >
                <el-icon class="signal-ep-info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
          </div>
        </div>
      </template>

      <el-descriptions :column="3" border class="signal-ep-descriptions signal-ep-descriptions-compact">
        <el-descriptions-item v-for="item in preTradeChecks" :key="item.label" :label="item.label">
          {{ item.value }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="signal-ep-panel">
      <template #header>
        <div class="signal-ep-card-header">
          <div>
            <div class="signal-ep-title-row">
              <div class="section-title">步骤 1：今日建议动作</div>
              <el-tooltip
                effect="light"
                placement="right"
                :content="sectionTip('这是今天真正要执行的正式下单清单，建议优先按这里的顺序处理。')"
              >
                <el-icon class="signal-ep-info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
          </div>
          <el-button @click="copyChecklist">复制下单清单</el-button>
        </div>
      </template>

      <div class="signal-ep-stat-strip signal-ep-action-strip">
        <div v-for="item in prioritySummaryItems" :key="item.label" class="signal-ep-stat-strip-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div v-if="actionableItems.length" class="signal-ep-table-wrap">
        <el-table :data="actionableItems" stripe class="signal-ep-table" :default-sort="{ prop: 'rank', order: 'ascending' }">
          <el-table-column label="动作" min-width="92">
            <template #default="{ row }">
              <el-tag :type="actionTagType(row.action)" effect="light" round>{{ row.action }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="symbol" label="代码" min-width="110" />
          <el-table-column prop="name" label="名称" min-width="130" />
          <el-table-column label="当前价" min-width="100">
            <template #default="{ row }">
              {{ row.last_price ? formatPrice(row.last_price) : "-" }}
            </template>
          </el-table-column>
          <el-table-column prop="current_quantity" label="当前股数" min-width="110" />
          <el-table-column prop="target_quantity" label="目标股数" min-width="110" />
          <el-table-column label="变动股数" min-width="110">
            <template #default="{ row }">
              {{ row.delta_quantity > 0 ? `+${row.delta_quantity}` : row.delta_quantity }}
            </template>
          </el-table-column>
          <el-table-column label="排名" min-width="80">
            <template #default="{ row }">
              {{ row.rank ? `#${row.rank}` : "-" }}
            </template>
          </el-table-column>
          <el-table-column label="预期5日收益" min-width="120">
            <template #default="{ row }">
              {{ formatPercent(row.predicted_return_5d) }}
            </template>
          </el-table-column>
          <el-table-column label="说明" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.note }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-else description="还没有可展示的调仓建议。" :image-size="72" />
    </el-card>

    <el-card shadow="never" class="signal-ep-panel">
      <template #header>
        <div class="signal-ep-card-header signal-ep-card-header-spread">
          <div>
            <div class="signal-ep-title-row">
              <div class="section-title">步骤 2：执行确认</div>
              <el-tooltip
                effect="light"
                placement="right"
                :content="sectionTip('下单后只回写真实成交，系统会自动检查偏差并形成后续复盘记录。')"
              >
                <el-icon class="signal-ep-info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
          </div>
        </div>
      </template>

      <div class="signal-ep-stat-strip signal-ep-stat-strip-secondary">
        <div v-for="item in executionSummaryCards" :key="item.label" class="signal-ep-stat-strip-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div class="signal-ep-stat-strip signal-ep-execution-warning-strip">
        <div
          v-for="item in executionAlertSummary"
          :key="item.label"
          class="signal-ep-stat-strip-item"
          :class="`is-${item.tone}`"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div v-if="executionAlertMessages.length" class="signal-ep-alert-summary">
        <div v-for="message in executionAlertMessages" :key="message" class="signal-ep-alert-summary-item">
          {{ message }}
        </div>
      </div>

      <div v-if="signalExecutionItemsDraft.length" class="signal-ep-table-wrap">
        <el-table :data="signalExecutionItemsDraft" stripe class="signal-ep-table">
          <el-table-column label="动作" min-width="92">
            <template #default="{ row }">
              <el-tag :type="actionTagType(row.action)" effect="light" round>{{ row.action }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="symbol" label="代码" min-width="110" />
          <el-table-column prop="name" label="名称" min-width="130" />
          <el-table-column prop="planned_quantity" label="计划股数" min-width="110" />
          <el-table-column label="当前价" min-width="110">
            <template #default="{ row }">
              {{ row.reference_price ? formatPrice(row.reference_price) : "-" }}
            </template>
          </el-table-column>
          <el-table-column label="实际股数" min-width="150">
            <template #default="{ row, $index }">
              <el-input-number
                :model-value="row.executed_quantity"
                :min="0"
                controls-position="right"
                class="signal-ep-input-number"
                @update:model-value="(value) => emit('update:signalExecutionItem', $index, 'executed_quantity', value)"
              />
            </template>
          </el-table-column>
          <el-table-column label="成交价" min-width="150">
            <template #default="{ row, $index }">
              <el-input-number
                :model-value="row.executed_price"
                :min="0"
                :step="0.01"
                controls-position="right"
                class="signal-ep-input-number"
                @update:model-value="(value) => emit('update:signalExecutionItem', $index, 'executed_price', value)"
              />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="220">
            <template #default="{ row, $index }">
              <el-input
                :model-value="row.note"
                placeholder="分笔成交、未成交原因等"
                @update:model-value="(value) => emit('update:signalExecutionItem', $index, 'note', value)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-else description="当前没有需要回写的执行动作。" :image-size="72" />

      <div class="signal-ep-submit-zone">
        <div class="signal-ep-submit-note">
          <div class="signal-ep-field-label">执行备注</div>
          <el-input
            :model-value="signalReviewDraft"
            type="textarea"
            :rows="3"
            placeholder="补充成交说明或忽略原因。"
            @update:model-value="emit('update:signalReviewDraft', $event)"
          />
        </div>

        <div class="signal-ep-submit-footer">
          <div class="signal-ep-submit-status">
            <div class="signal-ep-field-label">当前状态</div>
            <div class="signal-ep-submit-status-row">
              <el-tag :type="reviewTagType(signalReview?.status)" effect="light" round>{{ reviewLabel }}</el-tag>
              <span>{{ reviewStatusHint }}</span>
            </div>
          </div>

          <div class="signal-ep-submit-actions">
            <el-button
              v-for="action in reviewActionOptions"
              :key="action.status"
              :type="action.type"
              :plain="action.plain"
              :disabled="signalReviewing"
              :loading="signalReviewing"
              @click="emit('save-review', action.status)"
            >
              {{ action.label }}
            </el-button>
          </div>
        </div>
      </div>

    </el-card>

    <el-card shadow="never" class="signal-ep-panel">
      <template #header>
        <div>
          <div class="signal-ep-title-row">
            <div class="section-title">步骤 3：最近执行复盘</div>
            <el-tooltip
              effect="light"
              placement="right"
              :content="sectionTip('这里看最近一段时间你整体执行得怎么样，用来判断是否需要调整执行习惯或策略。')"
            >
              <el-icon class="signal-ep-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>
      </template>

      <div class="signal-ep-stat-strip">
        <div v-for="item in historyOverviewCards" :key="item.label" class="signal-ep-stat-strip-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div class="signal-ep-stat-strip signal-ep-stat-strip-secondary">
        <div v-for="item in historyOverviewSummaryCards" :key="item.label" class="signal-ep-stat-strip-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="signal-ep-panel">
      <template #header>
        <div>
          <div class="signal-ep-title-row">
            <div class="section-title">步骤 4：最近信号历史</div>
            <el-tooltip
              effect="light"
              placement="right"
              :content="sectionTip('这里按时间回看每次信号、你的执行情况，以及后续表现。')"
            >
              <el-icon class="signal-ep-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>
      </template>

      <div v-if="signalHistory.length" class="signal-ep-table-wrap">
        <el-table :data="signalHistory" stripe class="signal-ep-table" row-key="model_run_id">
          <el-table-column type="expand" width="56">
            <template #default="{ row }">
              <div class="signal-ep-history-expand-shell">
                <div class="signal-ep-history-expand">
                  <div class="signal-ep-history-meta">
                    <div><span>平均预期</span><strong>{{ formatPercent(row.avg_predicted_return_5d) }}</strong></div>
                    <div><span>最强信号</span><strong>{{ formatPercent(row.best_predicted_return_5d) }}</strong></div>
                    <div class="signal-ep-history-meta-symbols">
                      <span>目标股票</span>
                      <div class="signal-ep-history-target-list">
                        <div
                          v-for="item in buildTargetStockItems(row.top_symbols, row.top_names, row.top_prices)"
                          :key="`${row.model_run_id}-${item.symbol}`"
                          class="signal-ep-history-target-item"
                        >
                          <strong>{{ item.symbol }} {{ item.name }}</strong>
                          <span>{{ item.price ? `现价 ${formatPrice(item.price)}` : "现价 -" }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="row.execution_summary?.items_count || row.review_performance?.executed_items_count"
                    class="signal-ep-stat-strip signal-ep-history-stat-strip"
                  >
                    <div class="signal-ep-stat-strip-item">
                      <span>执行进度</span>
                      <strong>{{ row.execution_summary?.executed_items_count || 0 }} / {{ row.execution_summary?.items_count || 0 }}</strong>
                    </div>
                    <div class="signal-ep-stat-strip-item">
                      <span>实际买入</span>
                      <strong>{{ formatNumber(row.execution_summary?.executed_buy_amount) }}</strong>
                    </div>
                    <div class="signal-ep-stat-strip-item">
                      <span>实际卖出</span>
                      <strong>{{ formatNumber(row.execution_summary?.executed_sell_amount) }}</strong>
                    </div>
                  </div>

                  <el-alert
                    v-if="row.review_performance?.priced_items_count"
                    :title="`已跟踪 ${row.review_performance.priced_items_count} 笔成交，按动作方向折算后的后续表现 ${formatPercent(row.review_performance.weighted_post_trade_move)}，覆盖金额 ${formatNumber(row.review_performance.tracked_notional)}`"
                    type="success"
                    :closable="false"
                    show-icon
                  />
                  <el-alert
                    v-else-if="row.review_status === 'executed' && row.review_performance?.executed_items_count"
                    title="已记录真实成交，后续价格跟踪数据还在等待更新。"
                    type="info"
                    :closable="false"
                    show-icon
                  />

                  <div v-if="row.execution_items?.length" class="signal-ep-history-detail-block">
                    <div class="signal-ep-history-detail-title">执行明细</div>
                    <div class="signal-ep-table-wrap signal-ep-nested-table-wrap">
                      <el-table :data="row.execution_items" stripe class="signal-ep-table">
                        <el-table-column label="动作" min-width="90">
                          <template #default="{ row: item }">
                            <el-tag :type="actionTagType(item.action)" effect="light" round>{{ item.action }}</el-tag>
                          </template>
                        </el-table-column>
                        <el-table-column prop="symbol" label="代码" min-width="100" />
                        <el-table-column prop="name" label="名称" min-width="120" />
                        <el-table-column prop="planned_quantity" label="计划股数" min-width="110" />
                        <el-table-column prop="executed_quantity" label="实际股数" min-width="110" />
                        <el-table-column label="成交价" min-width="100">
                          <template #default="{ row: item }">
                            {{ formatPrice(item.executed_price) }}
                          </template>
                        </el-table-column>
                        <el-table-column label="最新价" min-width="100">
                          <template #default="{ row: item }">
                            {{ item.tracked ? formatPrice(item.latest_price) : "-" }}
                          </template>
                        </el-table-column>
                        <el-table-column label="后续表现" min-width="110">
                          <template #default="{ row: item }">
                            <span :class="item.signed_return >= 0 ? 'positive-text' : 'negative-text'">
                              {{ item.tracked ? formatPercent(item.signed_return) : "-" }}
                            </span>
                          </template>
                        </el-table-column>
                        <el-table-column label="方向收益" min-width="120">
                          <template #default="{ row: item }">
                            {{ item.tracked ? formatNumber(item.signed_pnl) : "-" }}
                          </template>
                        </el-table-column>
                        <el-table-column label="备注" min-width="220" show-overflow-tooltip>
                          <template #default="{ row: item }">
                            {{ item.tracked ? `跟踪金额 ${formatNumber(item.latest_value)}` : (item.note || "未形成可复盘价格") }}
                          </template>
                        </el-table-column>
                      </el-table>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="generated_at" label="信号时间" min-width="170" />
          <el-table-column prop="model_name" label="模型" min-width="150" />
          <el-table-column label="状态" min-width="110">
            <template #default="{ row }">
              <el-tag :type="reviewTagType(row.review_status)" effect="light" round>
                {{ row.review_status === "executed" ? "已执行" : row.review_status === "ignored" ? "已忽略" : "待执行" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="平均预期" min-width="110">
            <template #default="{ row }">
              {{ formatPercent(row.avg_predicted_return_5d) }}
            </template>
          </el-table-column>
          <el-table-column label="最强信号" min-width="110">
            <template #default="{ row }">
              {{ formatPercent(row.best_predicted_return_5d) }}
            </template>
          </el-table-column>
          <el-table-column label="目标股票" min-width="320">
            <template #default="{ row }">
              <el-tooltip effect="light" placement="top-start">
                <template #content>
                  <div class="signal-ep-tooltip-stock-list">
                    <div
                      v-for="item in buildTargetStockItems(row.top_symbols, row.top_names, row.top_prices)"
                      :key="`${row.model_run_id}-tooltip-${item.symbol}`"
                      class="signal-ep-tooltip-stock-item"
                    >
                      <strong>{{ item.symbol }} {{ item.name }}</strong>
                      <span>{{ item.price ? `现价 ${formatPrice(item.price)}` : "现价 -" }}</span>
                    </div>
                  </div>
                </template>
                <span class="signal-ep-ellipsis-cell">
                  {{ formatTargetStocksCompact(row.top_symbols, row.top_names) }}
                </span>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-if="!signalHistory.length" description="还没有历史信号记录。" :image-size="72" />
    </el-card>

    <el-card shadow="never" class="signal-ep-panel">
      <template #header>
        <div>
          <div class="signal-ep-title-row">
            <div class="section-title">步骤 5：备选候选</div>
            <el-tooltip
              effect="light"
              placement="right"
              :content="sectionTip('这部分是可选项。只有当你不想完全照系统方案执行时，再从这里挑替代标的。')"
            >
              <el-icon class="signal-ep-info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </div>
      </template>

      <div v-if="signalTopCandidates.length" class="signal-ep-table-wrap">
        <el-table :data="signalTopCandidates" stripe class="signal-ep-table" :max-height="320">
          <el-table-column prop="rank" label="排名" min-width="80" />
          <el-table-column prop="symbol" label="代码" min-width="110" />
          <el-table-column prop="name" label="名称" min-width="140" />
          <el-table-column label="当前价" min-width="100">
            <template #default="{ row }">
              {{ row.last_price ? formatPrice(row.last_price) : "-" }}
            </template>
          </el-table-column>
          <el-table-column label="预期5日收益" min-width="130">
            <template #default="{ row }">
              {{ formatPercent(row.predicted_return_5d) }}
            </template>
          </el-table-column>
          <el-table-column label="综合分数" min-width="120">
            <template #default="{ row }">
              {{ row.score.toFixed(3) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-else description="还没有候选信号。" :image-size="72" />
    </el-card>
  </section>
</template>
