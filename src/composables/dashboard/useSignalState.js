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
  let signalMessageTimer = null;

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
  function buildSignalQualitySlice(label, sample) {
    const executedRows = sample.filter((item) => item.review_status === "executed");
    const ignoredRows = sample.filter((item) => item.review_status === "ignored");
    const pendingRows = sample.filter((item) => item.review_status === "pending");
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
      label,
      totalSignals: sample.length,
      executedSignals: executedRows.length,
      ignoredSignals: ignoredRows.length,
      pendingSignals: pendingRows.length,
      trackedSignals: trackedRows.length,
      adoptionRate: sample.length ? executedRows.length / sample.length : 0,
      trackingRate: executedRows.length ? trackedRows.length / executedRows.length : 0,
      avgExpectedReturn: executedRows.length
        ? executedRows.reduce((sum, item) => sum + Number(item.avg_predicted_return_5d || 0), 0) / executedRows.length
        : 0,
      weightedFollowThrough,
      predictionGap:
        trackedRows.length > 0
          ? weightedFollowThrough -
            (trackedRows.reduce((sum, item) => sum + Number(item.avg_predicted_return_5d || 0), 0) / trackedRows.length)
          : 0,
      positiveTrackedSignals: trackedRows.filter(
        (item) => Number(item.review_performance?.weighted_post_trade_move || 0) > 0,
      ).length,
      totalTrackedNotional,
      executedBuyAmount: executedRows.reduce(
        (sum, item) => sum + Number(item.execution_summary?.executed_buy_amount || 0),
        0,
      ),
      executedSellAmount: executedRows.reduce(
        (sum, item) => sum + Number(item.execution_summary?.executed_sell_amount || 0),
        0,
      ),
    };
  }
  const signalQualityWindows = computed(() => {
    const rows = signalHistory.value || [];
    const windows = [5, 10, 20];

    return windows.map((size) => buildSignalQualitySlice(`最近 ${size} 次`, rows.slice(0, size)));
  });
  const signalQualityByTradeDate = computed(() => {
    const rows = signalHistory.value || [];
    const groups = new Map();
    rows.forEach((item) => {
      const tradeDate = String(item.trade_date || item.generated_at || "").slice(0, 10) || "未知";
      if (!groups.has(tradeDate)) {
        groups.set(tradeDate, []);
      }
      groups.get(tradeDate).push(item);
    });
    return Array.from(groups.entries())
      .slice(0, 8)
      .map(([tradeDate, sample]) => ({
        tradeDate,
        ...buildSignalQualitySlice(tradeDate, sample),
      }));
  });
  const signalQualityByModel = computed(() => {
    const rows = signalHistory.value || [];
    const groups = new Map();
    rows.forEach((item) => {
      const modelName = String(item.model_name || "未知模型");
      if (!groups.has(modelName)) {
        groups.set(modelName, []);
      }
      groups.get(modelName).push(item);
    });
    return Array.from(groups.entries())
      .map(([modelName, sample]) => ({
        modelName,
        ...buildSignalQualitySlice(modelName, sample),
      }))
      .sort((a, b) => b.totalSignals - a.totalSignals)
      .slice(0, 6);
  });
  const signalAdoptionComparison = computed(() => {
    const sample = (signalHistory.value || []).slice(0, 20);
    const makeRow = (label, rows) => {
      const trackedRows = rows.filter((item) => Number(item.review_performance?.priced_items_count || 0) > 0);
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
          : null;
      return {
        label,
        samples: rows.length,
        avgExpectedReturn: rows.length
          ? rows.reduce((sum, item) => sum + Number(item.avg_predicted_return_5d || 0), 0) / rows.length
          : 0,
        trackedSignals: trackedRows.length,
        weightedFollowThrough,
      };
    };

    const executedRows = sample.filter((item) => item.review_status === "executed");
    const ignoredRows = sample.filter((item) => item.review_status === "ignored");
    const pendingRows = sample.filter((item) => item.review_status === "pending");

    return {
      rows: [
        makeRow("已采纳", executedRows),
        makeRow("已忽略", ignoredRows),
        makeRow("待执行", pendingRows),
      ],
      executedAdvantage:
        executedRows.length && ignoredRows.length
          ? executedRows.reduce((sum, item) => sum + Number(item.avg_predicted_return_5d || 0), 0) / executedRows.length -
            ignoredRows.reduce((sum, item) => sum + Number(item.avg_predicted_return_5d || 0), 0) / ignoredRows.length
          : 0,
    };
  });
  const signalTrackedOutcomeSeries = computed(() =>
    (signalHistory.value || [])
      .filter(
        (item) =>
          item.review_status === "executed" && Number(item.review_performance?.priced_items_count || 0) > 0,
      )
      .map((item) => {
        const actual = Number(item.review_performance?.weighted_post_trade_move || 0);
        const expected = Number(item.avg_predicted_return_5d || 0);
        return {
          modelRunId: item.model_run_id,
          generatedAt: item.generated_at,
          actual,
          expected,
          gap: actual - expected,
          trackedNotional: Number(item.review_performance?.tracked_notional || 0),
          outcome: actual > 0 ? "positive" : actual < 0 ? "negative" : "flat",
        };
      }),
  );
  const signalQualityMomentum = computed(() => {
    const series = signalTrackedOutcomeSeries.value;
    let positiveStreak = 0;
    let negativeStreak = 0;
    for (const item of series) {
      if (item.actual > 0) {
        positiveStreak += 1;
      } else {
        break;
      }
    }
    for (const item of series) {
      if (item.actual < 0) {
        negativeStreak += 1;
      } else {
        break;
      }
    }
    const latest = series[0] || null;
    return {
      trackedSignals: series.length,
      positiveStreak,
      negativeStreak,
      latestOutcome: latest?.actual ?? 0,
      latestExpected: latest?.expected ?? 0,
      latestGap: latest?.gap ?? 0,
      latestGeneratedAt: latest?.generatedAt ?? "",
    };
  });
  const signalQualityRecommendation = computed(() => {
    const latestFive = signalQualityWindows.value[0] || null;
    const latestTen = signalQualityWindows.value[1] || null;
    const momentum = signalQualityMomentum.value;
    const reasons = [];

    if ((momentum.trackedSignals || 0) < 3) {
      reasons.push("最近已跟踪样本还太少，先把它当成观察信号，不要过度放大结论。");
      return {
        level: "observe",
        label: "继续观察",
        shortLabel: "样本不足",
        reasons,
      };
    }

    if ((momentum.negativeStreak || 0) >= 3) {
      reasons.push(`最近连续 ${momentum.negativeStreak} 次实际跟随效果为负，说明信号短期失效率偏高。`);
    }
    if ((latestTen?.weightedFollowThrough || 0) < 0) {
      reasons.push("最近 10 次整体跟随效果为负，说明按信号执行后整体没有兑现预期。");
    }
    if ((latestTen?.predictionGap || 0) <= -0.02) {
      reasons.push("最近 10 次实际结果明显低于预期，模型给出的收益预估偏乐观。");
    }
    if ((latestFive?.weightedFollowThrough || 0) < 0 && (latestFive?.trackingRate || 0) >= 0.5) {
      reasons.push("最近 5 次里已有足够跟踪样本，但短期结果仍然偏弱。");
    }

    if (reasons.length >= 2) {
      return {
        level: "reduce",
        label: "降低参考权重",
        shortLabel: "短期偏弱",
        reasons,
      };
    }

    if (reasons.length === 1) {
      return {
        level: "cautious",
        label: "谨慎参考",
        shortLabel: "需要观察",
        reasons,
      };
    }

    const positiveReasons = [];
    if ((momentum.positiveStreak || 0) >= 3) {
      positiveReasons.push(`最近连续 ${momentum.positiveStreak} 次实际跟随效果为正。`);
    }
    if ((latestTen?.weightedFollowThrough || 0) > 0) {
      positiveReasons.push("最近 10 次整体跟随效果为正，执行后表现仍在兑现。");
    }
    if ((latestTen?.predictionGap || 0) >= -0.005) {
      positiveReasons.push("最近实际结果和预期偏差不大，没有出现明显失真。");
    }

    return {
      level: positiveReasons.length >= 2 ? "normal" : "watch",
      label: positiveReasons.length >= 2 ? "可正常参考" : "继续正常参考",
      shortLabel: positiveReasons.length >= 2 ? "状态稳定" : "轻度观察",
      reasons: positiveReasons.length
        ? positiveReasons
        : ["最近没有明显失效迹象，可以继续参考，但仍建议保留人工复核。"],
    };
  });
  const signalQualityGuidance = computed(() => {
    const recommendation = signalQualityRecommendation.value || {};
    const level = recommendation.level || "observe";

    const guidanceMap = {
      observe: {
        modeLabel: "仅观察",
        referenceWeight: "0% - 30%",
        action: "先观察，不建议直接按信号做真实下单决策。",
        executionRule: "今天只看信号变化，不做真实执行；等样本再积累几次后再恢复参考。",
      },
      reduce: {
        modeLabel: "降低权重",
        referenceWeight: "30% - 50%",
        action: "最近信号偏弱，建议降低参考权重，只保留最强样本做人工复核。",
        executionRule: "只参考最强的 1 - 2 只信号，仓位减半；其余样本只做观察记录。",
      },
      cautious: {
        modeLabel: "谨慎参考",
        referenceWeight: "50% - 70%",
        action: "可以继续看，但建议缩小参考范围，只挑更强的信号。",
        executionRule: "优先看排名最前的信号，并提高人工筛选标准；弱信号可以直接跳过。",
      },
      watch: {
        modeLabel: "继续观察",
        referenceWeight: "70% - 90%",
        action: "整体还能参考，但要继续关注是否出现连续走弱。",
        executionRule: "正常参考主信号，但如果当天出现明显异常，优先保留手动否决权。",
      },
      normal: {
        modeLabel: "正常参考",
        referenceWeight: "100%",
        action: "可以继续把这套信号当作主要参考，正常配合人工复核执行。",
        executionRule: "按正常信号流程执行，先看今日建议动作，再回写成交并做复盘。",
      },
    };

    return {
      ...(guidanceMap[level] || guidanceMap.observe),
      level,
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
    const actionMap = new Map(
      (center?.action_items || []).map((item) => [String(item.symbol), Number(item.last_price || 0)]),
    );
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
          reference_price: Number(item.last_price || 0),
          note: "",
        })) || []
    ).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      action: item.action,
      planned_quantity: Number(item.planned_quantity || 0),
      executed_quantity: Number(item.executed_quantity || 0),
      executed_price: Number(item.executed_price || 0),
      reference_price: Number(item.reference_price || actionMap.get(String(item.symbol)) || item.executed_price || 0),
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
      const [center, history] = await Promise.all([fetchSignalCenter(), fetchSignalHistory({ limit: 24 })]);

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
    if (signalMessageTimer) {
      window.clearTimeout(signalMessageTimer);
      signalMessageTimer = null;
    }
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
      signalMessageTimer = window.setTimeout(() => {
        signalMessage.value = "";
        signalMessageTimer = null;
      }, 3000);
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
    if (signalMessageTimer) {
      window.clearTimeout(signalMessageTimer);
      signalMessageTimer = null;
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
    signalQualityWindows,
    signalQualityByTradeDate,
    signalQualityByModel,
    signalAdoptionComparison,
    signalQualityMomentum,
    signalQualityRecommendation,
    signalQualityGuidance,
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
