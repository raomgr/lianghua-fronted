import { computed, ref } from "vue";
import { saveCustomUniverse, fetchUniverseSearch } from "../../services/universe";

export function useUniverseState(errorRef, onSaved) {
  const savingUniverse = ref(false);
  const lastUniverseMessage = ref("");
  const customUniverseItems = ref([]);
  const customUniverseInput = ref("");
  const universeSearchQuery = ref("");
  const universeSearchResults = ref([]);

  const customUniverseSymbols = computed(() => new Set(customUniverseItems.value.map((item) => item.symbol)));
  const canSaveUniverse = computed(
    () => savingUniverse.value || customUniverseItems.value.length > 0 || customUniverseInput.value.trim(),
  );

  async function handleSaveCustomUniverse() {
    savingUniverse.value = true;
    lastUniverseMessage.value = "";
    errorRef.value = "";

    try {
      const symbols = customUniverseInput.value
        .split(/[\s,，;；]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      const knownItems = new Map(customUniverseItems.value.map((item) => [item.symbol, item]));
      universeSearchResults.value.forEach((item) => {
        knownItems.set(item.symbol, item);
      });
      const payloadItems = symbols.map((symbol) => knownItems.get(symbol) ?? { symbol, name: symbol });
      const result = await saveCustomUniverse(symbols, payloadItems);
      customUniverseItems.value = result.items;
      customUniverseInput.value = result.items.map((item) => item.symbol).join("\n");
      lastUniverseMessage.value = result.message;
      await onSaved();
    } catch (err) {
      errorRef.value = err.message;
    } finally {
      savingUniverse.value = false;
    }
  }

  async function handleUniverseSearch() {
    const query = universeSearchQuery.value.trim();
    if (!query) {
      universeSearchResults.value = [];
      return;
    }

    try {
      universeSearchResults.value = await fetchUniverseSearch(query);
    } catch (err) {
      errorRef.value = err.message;
    }
  }

  function syncCustomUniverseInput() {
    customUniverseInput.value = customUniverseItems.value.map((item) => item.symbol).join("\n");
  }

  function handleClearUniverseSelection() {
    customUniverseItems.value = [];
    customUniverseInput.value = "";
    lastUniverseMessage.value = "已清空当前待保存的股票池。点击保存后会恢复默认跟踪列表。";
  }

  function handleAddUniverseItem(item) {
    if (customUniverseSymbols.value.has(item.symbol)) {
      return;
    }
    customUniverseItems.value = [...customUniverseItems.value, item];
    syncCustomUniverseInput();
  }

  function handleRemoveUniverseItem(symbol) {
    customUniverseItems.value = customUniverseItems.value.filter((item) => item.symbol !== symbol);
    syncCustomUniverseInput();
  }

  function setCustomUniverseInput(value) {
    customUniverseInput.value = value;
  }

  function setUniverseSearchQuery(value) {
    universeSearchQuery.value = value;
  }

  return {
    savingUniverse,
    lastUniverseMessage,
    customUniverseItems,
    customUniverseInput,
    universeSearchQuery,
    universeSearchResults,
    customUniverseSymbols,
    canSaveUniverse,
    handleSaveCustomUniverse,
    handleUniverseSearch,
    handleClearUniverseSelection,
    handleAddUniverseItem,
    handleRemoveUniverseItem,
    setCustomUniverseInput,
    setUniverseSearchQuery,
  };
}
