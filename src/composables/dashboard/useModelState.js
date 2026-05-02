import { computed, ref } from "vue";
import { triggerModelTrain } from "../../services/model";

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
      const result = await triggerModelTrain();
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
