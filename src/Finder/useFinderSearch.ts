import { computed, nextTick, ref, type ComputedRef, type Ref } from "vue";
import {
  getNextSelectedPath,
  getNextVisibleCount,
  getRestoredSelectedPath,
  sortResults,
  type FinderResult,
  type FinderSortMode,
} from "./finderLogic";

interface UseFinderSearchOptions {
  pageSize: number;
  maxResults: number;
  buildQuery: () => string;
  sortMode: Ref<FinderSortMode>;
  resultFilterCount: ComputedRef<number>;
  onSelectionRestored?: () => void;
}

export function useFinderSearch({
  pageSize,
  maxResults,
  buildQuery,
  sortMode,
  resultFilterCount,
  onSelectionRestored,
}: UseFinderSearchOptions) {
  const results = ref<FinderResult[]>([]);
  const everythingTotal = ref(0);
  const visibleCount = ref(pageSize);
  const selectedPath = ref("");
  const statusText = ref("输入关键字开始搜索");
  const isLoading = ref(false);
  const sortedResults = computed(() => sortResults(results.value, sortMode.value));
  const visibleResults = computed(() => sortedResults.value.slice(0, visibleCount.value));
  const selectedItem = computed(() =>
    sortedResults.value.find((item) => item.fullPath === selectedPath.value),
  );

  let searchTimer: number | undefined;

  function queueSearch() {
    if (searchTimer) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => runSearch(), 120);
  }

  function runSearch() {
    const everythingQuery = buildQuery();

    if (!window.services.everything.isAvailable()) {
      results.value = [];
      everythingTotal.value = 0;
      statusText.value = "Everything addon 不可用";
      return;
    }

    isLoading.value = true;
    visibleCount.value = pageSize;

    try {
      const result = window.services.everything.query(everythingQuery, maxResults, sortMode.value);
      results.value = result.items;
      everythingTotal.value = result.total;
      updateResultStatus();
      restoreSelection();
    } catch (error: unknown) {
      results.value = [];
      everythingTotal.value = 0;
      statusText.value = error instanceof Error ? error.message : "搜索失败";
    } finally {
      isLoading.value = false;
    }
  }

  function updateResultStatus() {
    const loadedCount = results.value.length;
    const filterCount = resultFilterCount.value;

    if (loadedCount === 0) {
      statusText.value = filterCount > 0 ? "没有找到结果（已应用过滤器）" : "没有找到结果";
      return;
    }

    statusText.value =
      filterCount > 0
        ? `已加载 ${loadedCount} / ${everythingTotal.value} 个过滤后结果`
        : `已加载 ${loadedCount} / ${everythingTotal.value} 个结果`;
  }

  function restoreSelection() {
    selectedPath.value = getRestoredSelectedPath(sortedResults.value, selectedPath.value);
    nextTick(() => onSelectionRestored?.());
  }

  function selectItem(item: FinderResult) {
    selectedPath.value = item.fullPath ?? "";
  }

  function clearSelection() {
    selectedPath.value = "";
  }

  function moveSelection(direction: -1 | 1) {
    const paths = sortedResults.value
      .map((item) => item.fullPath)
      .filter((path): path is string => !!path);
    const nextPath = getNextSelectedPath(paths, selectedPath.value, direction);
    if (!nextPath) return;

    selectedPath.value = nextPath;
    const nextIndex = sortedResults.value.findIndex((item) => item.fullPath === nextPath);
    if (nextIndex >= visibleCount.value - 4) {
      visibleCount.value = getNextVisibleCount(
        visibleCount.value,
        sortedResults.value.length,
        pageSize,
      );
    }
  }

  function growVisibleCount() {
    visibleCount.value = getNextVisibleCount(
      visibleCount.value,
      sortedResults.value.length,
      pageSize,
    );
  }

  function resetVisibleCount() {
    visibleCount.value = pageSize;
  }

  function clearSearchTimer() {
    if (searchTimer) window.clearTimeout(searchTimer);
  }

  return {
    results,
    everythingTotal,
    visibleCount,
    selectedPath,
    statusText,
    isLoading,
    sortedResults,
    visibleResults,
    selectedItem,
    queueSearch,
    runSearch,
    restoreSelection,
    updateResultStatus,
    selectItem,
    clearSelection,
    moveSelection,
    growVisibleCount,
    resetVisibleCount,
    clearSearchTimer,
  };
}
