<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import CustomCategoryDialog from "./CustomCategoryDialog.vue";
import FinderFooter from "./FinderFooter.vue";
import FinderPreviewPane from "./FinderPreviewPane.vue";
import FinderResultList from "./FinderResultList.vue";
import FinderSidebar from "./FinderSidebar.vue";
import SettingsDrawer from "./SettingsDrawer.vue";
import type { PreviewKind } from "./preview/previewTypes";
import { useCustomCategories } from "./useCustomCategories";
import { useFinderSearch } from "./useFinderSearch";
import { useResultFilters, type ResultFilterInput } from "./useResultFilters";
import { useSubInput } from "./useSubInput";
import {
  DEFAULT_CATEGORIES,
  buildEverythingQuery,
  formatBytes,
  isAudioPreviewCandidate,
  isImagePreviewCandidate,
  isTextPreviewCandidate,
  isVideoPreviewCandidate,
  type FinderCategory,
  type FinderSortMode,
} from "./finderLogic";

const props = defineProps<{
  enterAction: Record<string, unknown>;
}>();

const PAGE_SIZE = 50;
const MAX_RESULTS = 100;
const PREVIEW_BYTES = 20 * 1024;

const queryText = ref("");
const activeCategoryId = ref("all");
const sortMode = ref<FinderSortMode>("modified-desc");
const showSortMenu = ref(false);
const previewEnabled = ref(false);
const previewKind = ref<PreviewKind>("empty");
const previewContent = ref("");
const previewSource = ref("");
const previewEncoding = ref("");
const previewStatus = ref("未开启预览");
const showCategoryDialog = ref(false);
const showSettingsDrawer = ref(false);

const sortOptions: Array<{ value: FinderSortMode; label: string }> = [
  { value: "modified-desc", label: "按修改时间降序" },
  { value: "modified-asc", label: "按修改时间升序" },
  { value: "name-asc", label: "按名称升序" },
  { value: "name-desc", label: "按名称降序" },
  { value: "path-asc", label: "按路径升序" },
  { value: "path-desc", label: "按路径降序" },
  { value: "size-asc", label: "按大小升序" },
  { value: "size-desc", label: "按大小降序" },
];

const { customCategories, loadCustomCategories, addCustomCategory, removeCustomCategory } =
  useCustomCategories();
const { resultFilters, loadResultFilters, addResultFilter, removeResultFilter, buildQueryFilter } =
  useResultFilters();

const categories = computed(() => [...DEFAULT_CATEGORIES, ...customCategories.value]);
const activeCategory = computed(
  () =>
    categories.value.find((category) => category.id === activeCategoryId.value) ??
    DEFAULT_CATEGORIES[0],
);
const previewLabel = computed(() => (previewEnabled.value ? "关闭文件预览" : "开启文件预览"));
const activeSortLabel = computed(
  () => sortOptions.find((option) => option.value === sortMode.value)?.label ?? "排序",
);
const resultFilterCount = computed(() => resultFilters.value.length);

const finderSearch = useFinderSearch({
  pageSize: PAGE_SIZE,
  maxResults: MAX_RESULTS,
  sortMode,
  resultFilterCount,
  buildQuery: buildFilteredEverythingQuery,
  onSelectionRestored: loadPreview,
});

const { bindSubInput, syncSubInputValue, focusSubInput, disposeSubInput } = useSubInput({
  queryText,
  onInput: finderSearch.queueSearch,
});

watch(
  () => props.enterAction,
  (enterAction) => {
    const payload = getRecordValue(enterAction, "payload");
    const option = getRecordValue(enterAction, "option");
    const incomingQuery =
      getStringValue(payload, "query") ??
      getStringValue(payload, "text") ??
      getStringValue(option, "query") ??
      "";
    const incomingPath =
      getStringValue(payload, "selectedPath") ?? getStringValue(option, "fullPath");

    queryText.value = incomingQuery;
    syncSubInputValue();
    finderSearch.selectedPath.value = incomingPath ?? "";
    finderSearch.queueSearch();
  },
  { immediate: true },
);

watch([activeCategoryId, sortMode], () => {
  finderSearch.resetVisibleCount();
  if (activeCategoryId.value) finderSearch.queueSearch();
});

watch([finderSearch.selectedItem, previewEnabled], () => {
  loadPreview();
});

watch(
  resultFilters,
  () => {
    finderSearch.resetVisibleCount();
    finderSearch.queueSearch();
  },
  { deep: true },
);

onMounted(() => {
  window.ztools.setExpendHeight(650);
  loadCustomCategories();
  loadResultFilters();
  bindSubInput();
  syncSubInputValue();
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("pointerdown", handleGlobalPointerdown);
  finderSearch.queueSearch();
});

onUnmounted(() => {
  disposeSubInput();
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("pointerdown", handleGlobalPointerdown);
  finderSearch.clearSearchTimer();
});

function buildFilteredEverythingQuery() {
  return [buildEverythingQuery(queryText.value, activeCategory.value), buildQueryFilter()]
    .filter(Boolean)
    .join(" ");
}

function getRecordValue(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getStringValue(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function releaseFinderFocus() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && activeElement.closest(".finder-shell")) {
    activeElement.blur();
  }
  focusSubInput();
}

function selectCategory(category: FinderCategory) {
  activeCategoryId.value = category.id;
  releaseFinderFocus();
}

function handleRemoveCustomCategory(category: FinderCategory) {
  removeCustomCategory(category);
  if (activeCategoryId.value === category.id) activeCategoryId.value = "all";
}

function openCategoryDialog() {
  showCategoryDialog.value = true;
  releaseFinderFocus();
}

function closeCategoryDialog() {
  showCategoryDialog.value = false;
  focusSubInput();
}

function handleAddCustomCategory(input: Pick<FinderCategory, "label" | "rule">) {
  try {
    const category = addCustomCategory(input.label, input.rule);
    activeCategoryId.value = category.id;
  } catch (error) {
    console.warn("[local-search-neo] 保存自定义过滤器失败:", error);
  }

  closeCategoryDialog();
}

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

function selectItem(item: { fullPath?: string }) {
  finderSearch.selectedPath.value = item.fullPath ?? "";
  releaseFinderFocus();
}

function handleNearBottom() {
  finderSearch.growVisibleCount();
}

function scrollSelectedIntoView() {
  const index = finderSearch.visibleResults.value.findIndex(
    (item) => item.fullPath === finderSearch.selectedPath.value,
  );
  if (index < 0) return;

  document.querySelector(`[data-result-index="${index}"]`)?.scrollIntoView({
    block: "nearest",
  });
}

function openSelected() {
  if (finderSearch.selectedItem.value?.fullPath) {
    window.ztools.shellOpenPath(finderSearch.selectedItem.value.fullPath);
  }
}

function loadPreview() {
  resetPreview();

  if (!previewEnabled.value) {
    previewStatus.value = "未开启预览";
    return;
  }

  const item = finderSearch.selectedItem.value;
  if (!item) {
    previewStatus.value = "选择文件后预览";
    return;
  }

  if (item.isDirectory) {
    previewStatus.value = "文件夹不支持预览";
    return;
  }

  if (!item.fullPath) {
    previewStatus.value = "缺少文件路径，无法预览";
    return;
  }

  if (isImagePreviewCandidate(item)) {
    previewKind.value = "image";
    previewSource.value = window.services.getFileUrl(item.fullPath);
    previewStatus.value = "图片预览";
    return;
  }

  if (isVideoPreviewCandidate(item)) {
    previewKind.value = "video";
    previewSource.value = window.services.getFileUrl(item.fullPath);
    previewStatus.value = "视频预览";
    return;
  }

  if (isAudioPreviewCandidate(item)) {
    previewKind.value = "audio";
    previewSource.value = window.services.getFileUrl(item.fullPath);
    previewStatus.value = "音频预览";
    return;
  }

  let shouldPreviewAsText = isTextPreviewCandidate(item);
  if (!shouldPreviewAsText) {
    try {
      shouldPreviewAsText = window.services.isTextFile(item.fullPath);
    } catch {
      shouldPreviewAsText = false;
    }
  }

  if (!shouldPreviewAsText) {
    previewStatus.value = "当前格式不支持预览";
    return;
  }

  try {
    const preview = window.services.readTextPreview(item.fullPath, PREVIEW_BYTES);
    if (!preview.isText) {
      previewStatus.value = "当前格式不支持预览";
      return;
    }

    previewKind.value = "text";
    previewContent.value = preview.text;
    previewEncoding.value = preview.encoding;
    previewStatus.value = `预览前 ${formatBytes(PREVIEW_BYTES)} 内容`;
  } catch (error: unknown) {
    resetPreview();
    previewStatus.value = error instanceof Error ? error.message : "预览失败";
  }
}

function resetPreview() {
  previewKind.value = "empty";
  previewContent.value = "";
  previewSource.value = "";
  previewEncoding.value = "";
}

function handleGlobalPointerdown(event: PointerEvent) {
  if (!showSortMenu.value) return;
  if (event.target instanceof HTMLElement && event.target.closest(".sort-select")) return;
  showSortMenu.value = false;
}

function toggleSortMenu() {
  showSortMenu.value = !showSortMenu.value;
}

function selectSortMode(mode: FinderSortMode) {
  sortMode.value = mode;
  showSortMenu.value = false;
  focusSubInput();
}

function handleKeydown(event: KeyboardEvent) {
  if (isNativeEditingTarget(event.target)) return;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (showCategoryDialog.value || showSettingsDrawer.value || showSortMenu.value) return;
    event.preventDefault();
    finderSearch.moveSelection(event.key === "ArrowDown" ? 1 : -1);
    nextTick(() => scrollSelectedIntoView());
    return;
  }

  if (shouldFocusSubInput(event)) {
    showSortMenu.value = false;
    focusSubInput();
  }
}

function shouldFocusSubInput(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") return true;
  if (event.key === "Backspace" || event.key === "Delete") return true;
  return event.key.length === 1;
}

function isNativeEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
</script>

<template>
  <main class="finder-shell" :class="{ 'preview-open': previewEnabled }">
    <FinderSidebar
      :categories="categories"
      :active-category-id="activeCategoryId"
      @select="selectCategory"
      @remove="handleRemoveCustomCategory"
      @add="openCategoryDialog"
    />

    <section class="finder-main">
      <FinderResultList
        :visible-results="finderSearch.visibleResults.value"
        :selected-path="finderSearch.selectedPath.value"
        :is-loading="finderSearch.isLoading.value"
        :status-text="finderSearch.statusText.value"
        :preview-open="previewEnabled"
        @near-bottom="handleNearBottom"
        @select="selectItem"
        @open="openSelected"
      />

      <FinderFooter
        v-model:preview-enabled="previewEnabled"
        :sort-options="sortOptions"
        :sort-mode="sortMode"
        :show-sort-menu="showSortMenu"
        :active-sort-label="activeSortLabel"
        :everything-total="finderSearch.everythingTotal.value"
        :preview-label="previewLabel"
        @open-settings="openSettingsDrawer"
        @toggle-sort-menu="toggleSortMenu"
        @select-sort-mode="selectSortMode"
      />
    </section>

    <FinderPreviewPane
      v-if="previewEnabled"
      :preview-kind="previewKind"
      :preview-status="previewStatus"
      :preview-content="previewContent"
      :preview-source="previewSource"
      :preview-encoding="previewEncoding"
    />

    <CustomCategoryDialog
      :open="showCategoryDialog"
      @close="closeCategoryDialog"
      @add="handleAddCustomCategory"
    />

    <SettingsDrawer
      :open="showSettingsDrawer"
      :filters="resultFilters"
      @close="closeSettingsDrawer"
      @add-result-filter="handleAddResultFilter"
      @remove-result-filter="handleRemoveResultFilter"
    />
  </main>
</template>

<style scoped>
.finder-shell {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  height: 100vh;
  min-height: 520px;
  max-height: 100vh;
  overflow: hidden;
  background: #2f3133;
  color: #f5f7fa;
  font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
}

.finder-shell.preview-open {
  grid-template-columns: 64px minmax(260px, 0.82fr) minmax(460px, 1.18fr);
}

.finder-main {
  display: grid;
  grid-template-rows: minmax(0, 1fr) 42px;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  overflow: visible;
}

.preview-open .finder-main {
  border-right: 1px solid #1f2022;
}

@media (prefers-color-scheme: light) {
  .finder-shell {
    background: #f4f6f8;
    color: #1f2328;
  }

  .preview-open .finder-main {
    border-right-color: #d5dbe3;
  }
}

@media (max-width: 760px) {
  .finder-shell {
    grid-template-columns: 60px minmax(0, 1fr);
  }

  .finder-shell.preview-open {
    grid-template-columns: 60px minmax(180px, 0.86fr) minmax(280px, 1.14fr);
  }
}

@media (max-width: 560px) {
  .finder-shell {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .finder-shell.preview-open {
    grid-template-columns: 56px minmax(0, 1fr);
  }
}
</style>
