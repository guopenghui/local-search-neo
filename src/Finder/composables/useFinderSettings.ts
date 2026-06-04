import { computed, ref } from "vue";
import { useResultFilters, type ResultFilterInput } from "./useResultFilters";

interface UseFinderSettingsOptions {
  focusSubInput: () => void;
}

export function useFinderSettings({ focusSubInput }: UseFinderSettingsOptions) {
  const showSettingsDrawer = ref(false);
  const {
    resultFilters,
    loadResultFilters,
    addResultFilter,
    removeResultFilter,
    buildQueryFilter,
  } = useResultFilters();
  const resultFilterCount = computed(() => resultFilters.value.length);

  function openSettingsDrawer() {
    showSettingsDrawer.value = true;
  }

  function closeSettingsDrawer() {
    showSettingsDrawer.value = false;
    focusSubInput();
  }

  function handleAddResultFilter(input: ResultFilterInput) {
    try {
      addResultFilter(input);
    } catch (error) {
      console.warn("[local-search-neo] 保存结果过滤器失败:", error);
    }
  }

  function handleRemoveResultFilter(id: string) {
    try {
      removeResultFilter(id);
    } catch (error) {
      console.warn("[local-search-neo] 删除结果过滤器失败:", error);
    }
  }

  return {
    resultFilters,
    resultFilterCount,
    showSettingsDrawer,
    loadResultFilters,
    buildQueryFilter,
    openSettingsDrawer,
    closeSettingsDrawer,
    handleAddResultFilter,
    handleRemoveResultFilter,
  };
}
