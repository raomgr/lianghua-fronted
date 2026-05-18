import { computed, ref } from "vue";
import { saveCustomUniverse, fetchUniverseSearch } from "../../services/universe";

export function useUniverseState(errorRef, onSaved) {
  const savingUniverse = ref(false);
  const lastUniverseMessage = ref("");
  const customUniverseItems = ref([]);
  const customUniverseInput = ref("");
  const universeSearchQuery = ref("");
  const universeSearchResults = ref([]);
  const universeSearchPage = ref(1);
  const universeSearchPageSize = ref(6);
  const universeSearchTotal = ref(0);

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

  async function handleUniverseSearch(page = universeSearchPage.value) {
    const query = universeSearchQuery.value.trim();
    if (!query) {
      universeSearchResults.value = [];
       universeSearchPage.value = 1;
       universeSearchTotal.value = 0;
      return;
    }

    try {
      const result = await fetchUniverseSearch(query, {
        page,
        pageSize: universeSearchPageSize.value,
      });
      universeSearchResults.value = result.items || [];
      universeSearchPage.value = Number(result.page || page || 1);
      universeSearchTotal.value = Number(result.total || 0);
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
    universeSearchPage.value = 1;
  }

  function setUniverseSearchPage(value) {
    universeSearchPage.value = Number(value || 1);
    handleUniverseSearch(universeSearchPage.value);
  }

  return {
    savingUniverse,
    lastUniverseMessage,
    customUniverseItems,
    customUniverseInput,
    universeSearchQuery,
    universeSearchResults,
    universeSearchPage,
    universeSearchPageSize,
    universeSearchTotal,
    customUniverseSymbols,
    canSaveUniverse,
    handleSaveCustomUniverse,
    handleUniverseSearch,
    handleClearUniverseSelection,
    handleAddUniverseItem,
    handleRemoveUniverseItem,
    setCustomUniverseInput,
    setUniverseSearchQuery,
    setUniverseSearchPage,
  };
}
