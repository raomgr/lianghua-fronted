import { computed, ref } from "vue";
import { fetchSignalCenter, fetchSignalHistory, saveSignalReview } from "../../services/signal";

export function useSignalState(errorRef) {
  const signalCenter = ref(null);
  const signalHistory = ref([]);
  const signalLoading = ref(false);
  const signalReviewing = ref(false);
  const signalReviewDraft = ref("");
  const signalMessage = ref("");
  let signalPollingTimer = null;

  const latestSignalSummary = computed(() => signalCenter.value?.summary ?? null);
  const latestSignalReview = computed(() => signalCenter.value?.review ?? null);
  const signalActionItems = computed(() => signalCenter.value?.action_items ?? []);
  const signalTargetPositions = computed(() => signalCenter.value?.target_positions ?? []);
  const signalTopCandidates = computed(() => signalCenter.value?.top_candidates ?? []);

  function setSignalReviewDraft(value) {
    signalReviewDraft.value = value;
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
    signalMessage,
    latestSignalSummary,
    latestSignalReview,
    signalActionItems,
    signalTargetPositions,
    signalTopCandidates,
    setSignalReviewDraft,
    loadSignalWorkspace,
    handleSaveSignalReview,
    startSignalPolling,
    stopSignalPolling,
  };
}
