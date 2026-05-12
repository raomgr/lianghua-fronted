import { computed, ref } from "vue";
import { fetchModelTrainJob, triggerModelTrain } from "../../services/model";

export function useModelState(errorRef, onTrained) {
  const modelStatus = ref(null);
  const modelDetail = ref(null);
  const modelCompare = ref([]);
  const modelRuns = ref([]);
  const predictions = ref([]);
  const training = ref(false);
  const updating = ref(false);
  const lastUpdateMessage = ref("");
  const lastTrainMessage = ref("");

  const championModel = computed(() => modelCompare.value.find((item) => item.is_champion) ?? modelCompare.value[0] ?? null);
  const topPrediction = computed(() => predictions.value[0] ?? null);
  const walkForwardSummary = computed(() => modelDetail.value?.metrics ?? {});

  async function handleTrainModel() {
    training.value = true;
    lastTrainMessage.value = "";

    try {
      const job = await triggerModelTrain();
      lastTrainMessage.value = job.message || "训练任务已创建，正在后台执行。";

      let latestJob = job;
      while (latestJob?.job_id && ["queued", "running"].includes(String(latestJob.status || ""))) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        latestJob = await fetchModelTrainJob(latestJob.job_id);
        if (latestJob?.message) {
          lastTrainMessage.value = latestJob.message;
        }
      }

      if (latestJob?.status !== "succeeded" || !latestJob?.result) {
        throw new Error(latestJob?.error || latestJob?.message || "训练任务失败");
      }

      const result = latestJob.result;
      lastTrainMessage.value = `${result.model_name} 已成为当前主模型，验证 IC ${result.validation_ic.toFixed(4)}`;
      await onTrained();
    } catch (err) {
      errorRef.value = err.message;
    } finally {
      training.value = false;
    }
  }

  return {
    modelStatus,
    modelDetail,
    modelCompare,
    modelRuns,
    predictions,
    training,
    updating,
    lastUpdateMessage,
    lastTrainMessage,
    championModel,
    topPrediction,
    walkForwardSummary,
    handleTrainModel,
  };
}
