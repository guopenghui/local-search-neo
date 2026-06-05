import { computed, ref } from "vue";
import type { ResultFilterInput } from "../core/resultFilters";
import { usePersistStorage } from "./usePersistStorage";

interface UseFinderSettingsOptions {
  focusSubInput: () => void;
}

export function useFinderSettings({ focusSubInput }: UseFinderSettingsOptions) {
  const showSettingsDrawer = ref(false);
  const {
    resultFilters,
    resultFiltersEnabled,
    setResultFiltersEnabled,
    addResultFilter,
    removeResultFilter,
    toggleResultFilter,
    buildQueryFilter,
  } = usePersistStorage();
  const resultFilterCount = computed(() =>
    resultFiltersEnabled.value ? resultFilters.value.filter((filter) => filter.enabled).length : 0,
  );

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

  function handleSetResultFiltersEnabled(enabled: boolean) {
    try {
      setResultFiltersEnabled(enabled);
    } catch (error) {
      console.warn("[local-search-neo] 保存结果过滤器总开关失败:", error);
    }
  }

  function handleToggleResultFilter(id: string, enabled: boolean) {
    try {
      toggleResultFilter(id, enabled);
    } catch (error) {
      console.warn("[local-search-neo] 保存结果过滤器开关失败:", error);
    }
  }

  return {
    resultFilters,
    resultFiltersEnabled,
    resultFilterCount,
    showSettingsDrawer,
    buildQueryFilter,
    openSettingsDrawer,
    closeSettingsDrawer,
    handleAddResultFilter,
    handleRemoveResultFilter,
    handleSetResultFiltersEnabled,
    handleToggleResultFilter,
  };
}
