import { computed, ref } from "vue";
import { fetchSignalCenter, fetchSignalHistory, saveSignalReview } from "../../services/signal";

export function useSignalState(errorRef) {
  const signalCenter = ref(null);
  const signalHistory = ref([]);
  const signalLoading = ref(false);
  const signalReviewing = ref(false);
  const signalReviewDraft = ref("");
  const signalExecutionItemsDraft = ref([]);
  const signalMessage = ref("");
  let signalPollingTimer = null;

  const latestSignalSummary = computed(() => signalCenter.value?.summary ?? null);
  const latestSignalReview = computed(() => signalCenter.value?.review ?? null);
  const signalActionItems = computed(() => signalCenter.value?.action_items ?? []);
  const signalTargetPositions = computed(() => signalCenter.value?.target_positions ?? []);
  const signalTopCandidates = computed(() => signalCenter.value?.top_candidates ?? []);
  const signalExecutionDeviation = computed(() => {
    const items = signalExecutionItemsDraft.value || [];
    const normalizedItems = items.map((item) => {
      const plannedQuantity = Math.max(Number(item.planned_quantity || 0), 0);
      const executedQuantity = Math.max(Number(item.executed_quantity || 0), 0);
      const executedPrice = Math.max(Number(item.executed_price || 0), 0);
      const quantityGap = executedQuantity - plannedQuantity;
      const completionRatio = plannedQuantity > 0 ? executedQuantity / plannedQuantity : 0;
      return {
        ...item,
        plannedQuantity,
        executedQuantity,
        executedPrice,
        quantityGap,
        completionRatio,
        plannedNotional: plannedQuantity * executedPrice,
        executedNotional: executedQuantity * executedPrice,
      };
    });

    const missedItems = normalizedItems.filter((item) => item.plannedQuantity > 0 && item.executedQuantity === 0);
    const partialItems = normalizedItems.filter(
      (item) => item.plannedQuantity > 0 && item.executedQuantity > 0 && item.executedQuantity < item.plannedQuantity,
    );
    const overfilledItems = normalizedItems.filter((item) => item.executedQuantity > item.plannedQuantity);
    const exactItems = normalizedItems.filter(
      (item) => item.plannedQuantity > 0 && item.executedQuantity === item.plannedQuantity,
    );
    const totalPlannedNotional = normalizedItems.reduce((sum, item) => sum + item.plannedNotional, 0);
    const totalExecutedNotional = normalizedItems.reduce((sum, item) => sum + item.executedNotional, 0);

    return {
      items: normalizedItems,
      missedItems,
      partialItems,
      overfilledItems,
      exactItems,
      completionRate: totalPlannedNotional > 0 ? totalExecutedNotional / totalPlannedNotional : 0,
      totalPlannedNotional,
      totalExecutedNotional,
      underExecutedNotional: Math.max(totalPlannedNotional - totalExecutedNotional, 0),
    };
  });
  const signalHistoryStats = computed(() => {
    const rows = signalHistory.value || [];
    const executedRows = rows.filter((item) => item.review_status === "executed");
    const ignoredRows = rows.filter((item) => item.review_status === "ignored");
    const pendingRows = rows.filter((item) => item.review_status === "pending");
    const trackedRows = executedRows.filter((item) => Number(item.review_performance?.priced_items_count || 0) > 0);
    const totalTrackedNotional = trackedRows.reduce(
      (sum, item) => sum + Number(item.review_performance?.tracked_notional || 0),
      0,
    );
    const weightedFollowThrough =
      totalTrackedNotional > 0
        ? trackedRows.reduce(
            (sum, item) =>
              sum +
              Number(item.review_performance?.weighted_post_trade_move || 0) *
                Number(item.review_performance?.tracked_notional || 0),
            0,
          ) / totalTrackedNotional
        : 0;

    return {
      totalSignals: rows.length,
      executedSignals: executedRows.length,
      ignoredSignals: ignoredRows.length,
      pendingSignals: pendingRows.length,
      adoptionRate: rows.length ? executedRows.length / rows.length : 0,
      avgExpectedReturnExecuted: executedRows.length
        ? executedRows.reduce((sum, item) => sum + Number(item.avg_predicted_return_5d || 0), 0) / executedRows.length
        : 0,
      trackedSignals: trackedRows.length,
      totalTrackedNotional,
      weightedFollowThrough,
      executedBuyAmount: executedRows.reduce(
        (sum, item) => sum + Number(item.execution_summary?.executed_buy_amount || 0),
        0,
      ),
      executedSellAmount: executedRows.reduce(
        (sum, item) => sum + Number(item.execution_summary?.executed_sell_amount || 0),
        0,
      ),
    };
  });
  const signalExecutionSummary = computed(() => {
    const items = signalExecutionItemsDraft.value;
    return {
      itemsCount: items.length,
      executedItemsCount: items.filter((item) => Number(item.executed_quantity || 0) > 0).length,
      executedBuyAmount: items
        .filter((item) => item.action === "买入" || item.action === "加仓")
        .reduce((sum, item) => sum + Number(item.executed_quantity || 0) * Number(item.executed_price || 0), 0),
      executedSellAmount: items
        .filter((item) => item.action === "卖出" || item.action === "减仓")
        .reduce((sum, item) => sum + Number(item.executed_quantity || 0) * Number(item.executed_price || 0), 0),
    };
  });

  function setSignalReviewDraft(value) {
    signalReviewDraft.value = value;
  }

  function syncExecutionDraftFromCenter(center) {
    signalExecutionItemsDraft.value = (center?.review?.execution_items?.length
      ? center.review.execution_items
      : center?.action_items?.filter((item) => item.action !== "持有").map((item) => ({
          symbol: item.symbol,
          name: item.name,
          action: item.action,
          planned_quantity:
            item.action === "卖出" || item.action === "减仓"
              ? Math.abs(Number(item.delta_quantity || 0))
              : Number(item.target_quantity || 0),
          executed_quantity: 0,
          executed_price: Number(item.last_price || 0),
          note: "",
        })) || []
    ).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      action: item.action,
      planned_quantity: Number(item.planned_quantity || 0),
      executed_quantity: Number(item.executed_quantity || 0),
      executed_price: Number(item.executed_price || 0),
      note: item.note || "",
    }));
  }

  function updateSignalExecutionItem(index, field, value) {
    const next = [...signalExecutionItemsDraft.value];
    const current = { ...next[index] };
    if (field === "executed_quantity") {
      current[field] = Math.max(Number(value || 0), 0);
    } else if (field === "executed_price") {
      current[field] = Math.max(Number(value || 0), 0);
    } else {
      current[field] = value;
    }
    next[index] = current;
    signalExecutionItemsDraft.value = next;
  }

  async function loadSignalWorkspace({ silent = false } = {}) {
    if (!silent) {
      signalLoading.value = true;
    }
    try {
      const [center, history] = await Promise.all([fetchSignalCenter(), fetchSignalHistory({ limit: 12 })]);
      signalCenter.value = center;
      signalHistory.value = history;
      signalReviewDraft.value = center?.review?.note ?? "";
      syncExecutionDraftFromCenter(center);
      return center;
    } catch (err) {
      errorRef.value = err.message;
      throw err;
    } finally {
      if (!silent) {
        signalLoading.value = false;
      }
    }
  }

  async function handleSaveSignalReview(status) {
    if (!latestSignalSummary.value?.model_run_id) {
      return;
    }
    signalReviewing.value = true;
    signalMessage.value = "";
    try {
      const review = await saveSignalReview({
        model_run_id: latestSignalSummary.value.model_run_id,
        status,
        note: signalReviewDraft.value,
        execution_items: signalExecutionItemsDraft.value,
      });
      signalMessage.value =
        status === "executed"
          ? "已标记为已执行。"
          : status === "ignored"
            ? "已标记为已忽略。"
            : "已恢复为待执行。";
      signalCenter.value = {
        ...signalCenter.value,
        review,
        summary: {
          ...signalCenter.value.summary,
          review_status: review.status,
        },
      };
      await loadSignalWorkspace({ silent: true });
    } catch (err) {
      errorRef.value = err.message;
    } finally {
      signalReviewing.value = false;
    }
  }

  function startSignalPolling(intervalMs = 60000) {
    stopSignalPolling();
    signalPollingTimer = window.setInterval(() => {
      loadSignalWorkspace({ silent: true }).catch(() => {});
    }, intervalMs);
  }

  function stopSignalPolling() {
    if (signalPollingTimer) {
      window.clearInterval(signalPollingTimer);
      signalPollingTimer = null;
    }
  }

  return {
    signalCenter,
    signalHistory,
    signalLoading,
    signalReviewing,
    signalReviewDraft,
    signalExecutionItemsDraft,
    signalExecutionSummary,
    signalExecutionDeviation,
    signalHistoryStats,
    signalMessage,
    latestSignalSummary,
    latestSignalReview,
    signalActionItems,
    signalTargetPositions,
    signalTopCandidates,
    setSignalReviewDraft,
    updateSignalExecutionItem,
    loadSignalWorkspace,
    handleSaveSignalReview,
    startSignalPolling,
    stopSignalPolling,
  };
}
