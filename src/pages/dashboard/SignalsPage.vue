<script setup>
import { onBeforeUnmount, onMounted } from "vue";
import SignalWorkspace from "../../components/dashboard/SignalWorkspace.vue";
import { useDashboardContext } from "../../composables/useDashboardContext";

const dashboard = useDashboardContext();

onMounted(() => {
  dashboard.loadSignalWorkspace().catch(() => {});
  dashboard.startSignalPolling(60000);
});

onBeforeUnmount(() => {
  dashboard.stopSignalPolling();
});
</script>

<template>
  <template v-if="dashboard.loading && !dashboard.signalCenter">
    加载中...
  </template>

  <template v-else>
    <p v-if="dashboard.error" class="subtle-caption">部分接口更新失败：{{ dashboard.error }}</p>

    <SignalWorkspace
      :signal-summary="dashboard.latestSignalSummary"
      :signal-review="dashboard.latestSignalReview"
      :signal-action-items="dashboard.signalActionItems"
      :signal-target-positions="dashboard.signalTargetPositions"
      :signal-top-candidates="dashboard.signalTopCandidates"
      :signal-history="dashboard.signalHistory"
      :signal-loading="dashboard.signalLoading"
      :signal-reviewing="dashboard.signalReviewing"
      :signal-review-draft="dashboard.signalReviewDraft"
      :signal-execution-items-draft="dashboard.signalExecutionItemsDraft"
      :signal-execution-summary="dashboard.signalExecutionSummary"
      :signal-execution-deviation="dashboard.signalExecutionDeviation"
      :signal-history-stats="dashboard.signalHistoryStats"
      :signal-message="dashboard.signalMessage"
      @refresh="dashboard.loadSignalWorkspace"
      @save-review="dashboard.handleSaveSignalReview"
      @update:signal-review-draft="dashboard.setSignalReviewDraft"
      @update:signalExecutionItem="dashboard.updateSignalExecutionItem"
    />
  </template>
</template>
