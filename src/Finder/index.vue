<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import SettingsDrawer from "./SettingsDrawer.vue";
import { getFileIconUrl } from "./fileIconCache";
import { useResultFilters, type ResultFilterInput } from "./useResultFilters";
import {
  DEFAULT_CATEGORIES,
  buildEverythingQuery,
  formatBytes,
  getNextSelectedPath,
  getNextVisibleCount,
  getRestoredSelectedPath,
  isTextPreviewCandidate,
  sortResults,
  type FinderCategory,
  type FinderResult,
  type FinderSortMode,
} from "./finderLogic";

const props = defineProps<{
  enterAction: Record<string, unknown>;
}>();

const CUSTOM_CATEGORY_STORAGE_KEY = "local-search-neo:finder:custom-categories";
const PAGE_SIZE = 50;
const MAX_RESULTS = 100;
const PREVIEW_BYTES = 20 * 1024;

const queryText = ref("");
const activeCategoryId = ref("all");
const customCategories = ref<FinderCategory[]>([]);
const results = ref<FinderResult[]>([]);
const everythingTotal = ref(0);
const visibleCount = ref(PAGE_SIZE);
const selectedPath = ref("");
const sortMode = ref<FinderSortMode>("modified-desc");
const showSortMenu = ref(false);
const previewEnabled = ref(false);
const previewContent = ref("");
const previewStatus = ref("未开启预览");
const statusText = ref("输入关键字开始搜索");
const isLoading = ref(false);
const searchTimer = ref<number | undefined>();
const showCategoryDialog = ref(false);
const showSettingsDrawer = ref(false);
const customCategoryLabel = ref("");
const customCategoryRule = ref("");
let subInputReady = false;

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

const { resultFilters, loadResultFilters, addResultFilter, removeResultFilter, buildQueryFilter } =
  useResultFilters();

const categories = computed(() => [...DEFAULT_CATEGORIES, ...customCategories.value]);
const activeCategory = computed(
  () =>
    categories.value.find((category) => category.id === activeCategoryId.value) ??
    DEFAULT_CATEGORIES[0],
);
const sortedResults = computed(() => sortResults(results.value, sortMode.value));
const visibleResults = computed(() => sortedResults.value.slice(0, visibleCount.value));
const selectedItem = computed(() =>
  sortedResults.value.find((item) => item.fullPath === selectedPath.value),
);
const previewLabel = computed(() => (previewEnabled.value ? "关闭文件预览" : "开启文件预览"));
const activeSortLabel = computed(
  () => sortOptions.find((option) => option.value === sortMode.value)?.label ?? "排序",
);

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
    selectedPath.value = incomingPath ?? "";

    queueSearch();
  },
  { immediate: true },
);

watch([activeCategoryId, sortMode], () => {
  visibleCount.value = PAGE_SIZE;
  if (activeCategoryId.value) queueSearch();
});

watch([selectedItem, previewEnabled], () => {
  loadPreview();
});

watch(
  resultFilters,
  () => {
    visibleCount.value = PAGE_SIZE;
    queueSearch();
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
  queueSearch();
});

onUnmounted(() => {
  window.ztools.removeSubInput();
  subInputReady = false;
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("pointerdown", handleGlobalPointerdown);
  if (searchTimer.value) window.clearTimeout(searchTimer.value);
});
function focusSubInput() {
  window.ztools.subInputFocus();
}

function syncSubInputValue() {
  if (!subInputReady) return;
  window.ztools.setSubInputValue(queryText.value);
}

function bindSubInput() {
  if (subInputReady) return;

  window.ztools.setSubInput(
    ({ text }) => {
      queryText.value = text;
      queueSearch();
    },
    "全盘搜索",
    true,
  );
  subInputReady = true;
}

function getRecordValue(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getStringValue(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function queueSearch() {
  if (searchTimer.value) window.clearTimeout(searchTimer.value);
  searchTimer.value = window.setTimeout(() => {
    runSearch();
  }, 120);
}

function buildFilteredEverythingQuery() {
  return [buildEverythingQuery(queryText.value, activeCategory.value), buildQueryFilter()]
    .filter(Boolean)
    .join(" ");
}

function runSearch() {
  const everythingQuery = buildFilteredEverythingQuery();

  if (!window.services.everything.isAvailable()) {
    results.value = [];
    everythingTotal.value = 0;
    statusText.value = "Everything addon 不可用";
    return;
  }

  isLoading.value = true;
  visibleCount.value = PAGE_SIZE;

  try {
    const result = window.services.everything.query(everythingQuery, MAX_RESULTS, sortMode.value);
    results.value = result.items;
    everythingTotal.value = result.total;
    updateResultStatus();
    restoreSelection();
  } catch (error: any) {
    results.value = [];
    everythingTotal.value = 0;
    statusText.value = error?.message ?? "搜索失败";
  } finally {
    isLoading.value = false;
  }
}

function restoreSelection() {
  selectedPath.value = getRestoredSelectedPath(sortedResults.value, selectedPath.value);
  nextTick(() => loadPreview());
}

function updateResultStatus() {
  const loadedCount = results.value.length;
  const filterCount = resultFilters.value.length;

  if (loadedCount === 0) {
    statusText.value = filterCount > 0 ? "没有找到结果（已应用过滤器）" : "没有找到结果";
    return;
  }

  statusText.value =
    filterCount > 0
      ? `已加载 ${loadedCount} / ${everythingTotal.value} 个过滤后结果`
      : `已加载 ${loadedCount} / ${everythingTotal.value} 个结果`;
}

function handleListScroll(event: Event) {
  const element = event.currentTarget as HTMLElement;
  const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
  if (distanceToBottom < 120) {
    visibleCount.value = getNextVisibleCount(
      visibleCount.value,
      sortedResults.value.length,
      PAGE_SIZE,
    );
  }
}

function selectItem(item: FinderResult) {
  selectedPath.value = item.fullPath ?? "";
  releaseFinderFocus();
}

function selectCategory(category: FinderCategory) {
  activeCategoryId.value = category.id;
  releaseFinderFocus();
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

function openCategoryDialog() {
  resetCategoryDialog();
  showCategoryDialog.value = true;
  releaseFinderFocus();
}

function closeCategoryDialog() {
  showCategoryDialog.value = false;
  resetCategoryDialog();
  focusSubInput();
}

function resetCategoryDialog() {
  customCategoryLabel.value = "";
  customCategoryRule.value = "";
}

function releaseFinderFocus() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && activeElement.closest(".finder-shell")) {
    activeElement.blur();
  }
  focusSubInput();
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
    moveSelection(event.key === "ArrowDown" ? 1 : -1);
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
      PAGE_SIZE,
    );
  }
  nextTick(() => scrollSelectedIntoView());
}

function scrollSelectedIntoView() {
  const index = visibleResults.value.findIndex((item) => item.fullPath === selectedPath.value);
  if (index < 0) return;

  document.querySelector(`[data-result-index="${index}"]`)?.scrollIntoView({
    block: "nearest",
  });
}

function openSelected() {
  if (selectedItem.value?.fullPath) {
    window.ztools.shellOpenPath(selectedItem.value.fullPath);
  }
}

function showSelectedInFolder() {
  if (selectedItem.value?.fullPath) {
    window.ztools.shellShowItemInFolder(selectedItem.value.fullPath);
  }
}

function loadPreview() {
  previewContent.value = "";

  if (!previewEnabled.value) {
    previewStatus.value = "未开启预览";
    return;
  }

  const item = selectedItem.value;
  if (!item) {
    previewStatus.value = "选择文件后预览";
    return;
  }

  if (!isTextPreviewCandidate(item)) {
    previewStatus.value = item.isDirectory ? "文件夹不支持预览" : "当前格式不支持文本预览";
    return;
  }

  try {
    previewContent.value = window.services.readTextPreview(item.fullPath ?? "", PREVIEW_BYTES);
    previewStatus.value = `预览前 ${formatBytes(PREVIEW_BYTES)} 内容`;
  } catch (error: any) {
    previewStatus.value = error?.message ?? "预览失败";
  }
}

function loadCustomCategories() {
  try {
    const stored = window.ztools.dbStorage.getItem<FinderCategory[]>(CUSTOM_CATEGORY_STORAGE_KEY);
    customCategories.value = Array.isArray(stored) ? stored : [];
  } catch (error) {
    customCategories.value = [];
  }
}

function saveCustomCategories() {
  window.ztools.dbStorage.setItem(CUSTOM_CATEGORY_STORAGE_KEY, customCategories.value);
}

function addCustomCategory() {
  const label = customCategoryLabel.value.trim();
  const rule = customCategoryRule.value.trim();
  if (!label || !rule) return;

  const category = {
    id: `custom-${Date.now()}`,
    label,
    kind: "custom",
    rule,
  } satisfies FinderCategory;

  customCategories.value = [...customCategories.value, category];
  activeCategoryId.value = category.id;

  try {
    saveCustomCategories();
  } catch (error) {
    console.warn("[local-search-neo] 保存自定义过滤器失败:", error);
  }

  closeCategoryDialog();
}

function removeCustomCategory(category: FinderCategory) {
  customCategories.value = customCategories.value.filter((item) => item.id !== category.id);
  saveCustomCategories();
  if (activeCategoryId.value === category.id) activeCategoryId.value = "all";
}

function iconFor(item: FinderResult) {
  return getFileIconUrl(item);
}

function fileInitial(item: FinderResult) {
  if (item.isDirectory) return "DIR";
  const extension = item.name.includes(".") ? item.name.split(".").pop() : "";
  return (extension || "FILE").slice(0, 4).toUpperCase();
}

function formatModified(value?: number) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => part.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}
</script>

<template>
  <main class="finder-shell" :class="{ 'preview-open': previewEnabled }">
    <aside class="finder-sidebar">
      <button
        v-for="category in categories"
        :key="category.id"
        class="category-button"
        :class="{ active: category.id === activeCategoryId }"
        tabindex="-1"
        @mousedown.prevent
        @click="selectCategory(category)"
      >
        <span>{{ category.label }}</span>
        <span
          v-if="category.kind === 'custom'"
          class="category-remove"
          title="删除分类"
          @click.stop="removeCustomCategory(category)"
        >
          ×
        </span>
      </button>

      <button
        class="add-category"
        title="添加分类"
        tabindex="-1"
        @mousedown.prevent
        @click="openCategoryDialog"
      >
        +
      </button>
    </aside>

    <section class="finder-main">
      <div class="result-list" @scroll="handleListScroll">
        <button
          v-for="(item, index) in visibleResults"
          :key="item.fullPath"
          :data-result-index="index"
          class="result-row"
          :class="{ selected: item.fullPath === selectedPath }"
          tabindex="-1"
          @mousedown.prevent
          @click="selectItem(item)"
          @dblclick="openSelected"
        >
          <span class="file-icon" :class="{ 'fallback-icon': !iconFor(item) }">
            <img v-if="iconFor(item)" :src="iconFor(item)" alt="" />
            <span v-else>{{ fileInitial(item) }}</span>
          </span>
          <span class="file-text">
            <span class="file-name">{{ item.name }}</span>
            <span class="file-path" :title="item.fullPath || item.path">{{ item.path }}</span>
          </span>
          <span class="file-meta">
            <span>{{ formatBytes(item.size) }}</span>
            <span>{{ formatModified(item.modifiedAt) }}</span>
          </span>
        </button>

        <div v-if="isLoading" class="empty-state">搜索中...</div>
        <div v-else-if="visibleResults.length === 0" class="empty-state">{{ statusText }}</div>
      </div>

      <footer class="finder-footer">
        <button
          class="settings-button"
          type="button"
          title="设置"
          tabindex="-1"
          @mousedown.prevent
          @click="openSettingsDrawer"
        >
          <span class="settings-button-icon" aria-hidden="true"></span>
        </button>
        <div class="sort-select">
          <button
            class="sort-trigger"
            type="button"
            tabindex="-1"
            aria-label="排序方式"
            :aria-expanded="showSortMenu"
            @mousedown.prevent
            @click="toggleSortMenu"
          >
            <span>{{ activeSortLabel }}</span>
            <span class="sort-trigger-arrow" aria-hidden="true"></span>
          </button>
          <div v-if="showSortMenu" class="sort-menu">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              class="sort-option"
              :class="{ active: option.value === sortMode }"
              tabindex="-1"
              @mousedown.prevent
              @click="selectSortMode(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <label class="preview-toggle">
          <span>{{ previewLabel }}</span>
          <input v-model="previewEnabled" type="checkbox" />
          <span class="toggle-track"></span>
        </label>
        <span class="result-count">共 {{ everythingTotal }} 条结果</span>
      </footer>
    </section>

    <aside v-if="previewEnabled" class="preview-pane">
      <header class="preview-header">
        <span class="preview-encoding">UTF-8</span>
        <span>{{ previewStatus }}</span>
      </header>
      <pre v-if="previewContent" class="preview-content">{{ previewContent }}</pre>
      <div v-else class="preview-empty">{{ previewStatus }}</div>
    </aside>

    <div v-if="showCategoryDialog" class="dialog-backdrop" @click.self="closeCategoryDialog">
      <form class="category-dialog" @submit.prevent="addCustomCategory">
        <h2>添加分类</h2>
        <label>
          <span>名称</span>
          <input v-model="customCategoryLabel" autocomplete="off" autofocus />
        </label>
        <label>
          <span>后缀名或 Everything 规则</span>
          <input
            v-model="customCategoryRule"
            autocomplete="off"
            placeholder="log;txt 或 path:C:\Windows"
          />
        </label>
        <div class="dialog-actions">
          <button type="button" @click="closeCategoryDialog">取消</button>
          <button type="submit">添加</button>
        </div>
      </form>
    </div>

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

.finder-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-height: 0;
  max-height: 100%;
  overflow: hidden auto;
  padding: 10px 5px 8px;
  border-right: 1px solid #47494c;
  background: #2b2d2f;
}

.category-button,
.add-category,
.result-row,
.settings-button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.category-button:focus,
.category-button:focus-visible,
.add-category:focus,
.add-category:focus-visible,
.result-row:focus,
.result-row:focus-visible,
.settings-button:focus,
.settings-button:focus-visible {
  outline: none;
}

.category-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 2px;
  color: #c8d0db;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.category-button.active {
  color: #a88cff;
  font-weight: 700;
}

.category-button:hover {
  background: #383a3d;
}

.category-remove {
  position: absolute;
  right: 4px;
  color: #858b92;
}

.add-category {
  margin-top: auto;
  height: 34px;
  color: #d5d9df;
  cursor: pointer;
  font-size: 22px;
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

.preview-open .file-meta {
  grid-template-columns: 52px;
}

.preview-open .file-meta span:last-child {
  display: none;
}

.result-list {
  overflow: auto;
  min-height: 0;
  height: 100%;
}

.result-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  grid-template-areas:
    "icon name meta"
    "icon path path";
  column-gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 4px 12px 4px 10px;
  text-align: left;
  cursor: pointer;
  background: #303234;
  border-bottom: 1px solid transparent;
}

.result-row:hover,
.result-row.selected {
  background: #4a4b4d;
}

.result-row.selected {
  box-shadow: inset 3px 0 0 #d8dbe0;
}

.file-icon {
  grid-area: icon;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  align-self: center;
  color: #cfd6df;
  background: transparent;
  font-size: 8px;
  font-weight: 700;
}

.file-icon img {
  display: block;
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.file-icon.fallback-icon {
  border: 1px solid #6a7078;
  background: #383b3f;
  box-sizing: border-box;
}

.file-text {
  display: contents;
}

.file-name {
  grid-area: name;
  overflow: hidden;
  color: #ffffff;
  font-size: 15px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-path,
.file-meta {
  overflow: hidden;
  color: #9ba1a8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-path {
  grid-area: path;
  font-size: 11px;
}

.file-meta {
  grid-area: meta;
  font-size: 12px;
}

.file-meta {
  display: grid;
  grid-template-columns: 52px 118px;
  align-items: flex-end;
  justify-content: end;
  gap: 8px;
  align-self: start;
  padding-top: 3px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.empty-state,
.preview-empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  color: #a6abb2;
}

.finder-footer {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: max-content minmax(120px, 1fr) auto max-content;
  align-items: center;
  gap: 14px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  overflow: visible;
  padding: 0 14px;
  background: #3a3a39;
  color: #c6ccd3;
  font-size: 12px;
}

.settings-button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 28px;
  padding: 0;
  background: transparent;
  color: #f0f3f7;
  cursor: pointer;
  border-radius: 4px;
}

.settings-button-icon {
  width: 18px;
  height: 18px;
  display: block;
  background: currentColor;
  mask: url("../assets/settings.svg") center / contain no-repeat;
}

.settings-button:hover {
  background: #5a5e65;
}

.sort-select {
  --sort-select-width: 158px;
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.sort-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: var(--sort-select-width);
  height: 30px;
  box-sizing: border-box;
  padding: 0 11px 0 12px;
  color: #e7ebf0;
  background: #34373b;
  border: 1px solid #555b63;
  border-radius: 5px;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.sort-trigger:hover,
.sort-trigger[aria-expanded="true"] {
  background: #3d4147;
  border-color: #68707a;
}

.sort-trigger-arrow {
  width: 6px;
  height: 6px;
  margin-top: -3px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  color: #aeb4bb;
  transform: rotate(45deg);
}

.sort-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 30;
  display: grid;
  width: var(--sort-select-width);
  box-sizing: border-box;
  padding: 6px;
  background: #2b2e33;
  border: 1px solid #515862;
  border-radius: 6px;
  box-shadow: 0 12px 28px rgb(0 0 0 / 30%);
}

.sort-option {
  height: 30px;
  padding: 0 10px;
  color: #dfe4ea;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1;
  text-align: left;
  cursor: pointer;
}

.sort-option:hover,
.sort-option.active {
  color: #ffffff;
  background: #424751;
}

.sort-trigger:focus,
.sort-trigger:focus-visible,
.sort-option:focus,
.sort-option:focus-visible,
.category-dialog input:focus,
.category-dialog input:focus-visible,
.dialog-actions button:focus,
.dialog-actions button:focus-visible {
  outline: none;
  box-shadow: none;
}

.category-dialog input:focus,
.category-dialog input:focus-visible {
  border-color: #7a8390;
}

.preview-toggle {
  grid-column: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 150px;
}

.preview-toggle input {
  position: absolute;
  opacity: 0;
}

.toggle-track {
  width: 36px;
  height: 18px;
  border-radius: 999px;
  background: #80848a;
  position: relative;
}

.toggle-track::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #e8eaed;
  transition: transform 0.15s ease;
}

.preview-toggle input:checked + .toggle-track {
  background: #8d7df0;
}

.preview-toggle input:checked + .toggle-track::after {
  transform: translateX(18px);
}

.result-count {
  grid-column: 4;
  justify-self: end;
  color: #aeb4bb;
}

.preview-open .finder-footer {
  grid-template-columns: max-content minmax(12px, 1fr) max-content;
}

.preview-open .preview-toggle {
  min-width: 44px;
}

.preview-open .preview-toggle > span:first-child {
  display: none;
}

.preview-open .result-count {
  display: none;
}

.preview-pane {
  display: grid;
  grid-template-rows: 30px minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  background: #121315;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  padding: 0 12px;
  color: #ffffff;
  border-bottom: 1px solid #282a2d;
  font-size: 12px;
}

.preview-encoding {
  color: #9ba1a8;
  font-family: Consolas, "Cascadia Mono", monospace;
}

.preview-header span:last-child {
  margin-left: auto;
  color: #c3c8cf;
  white-space: nowrap;
}

.preview-content {
  overflow: auto;
  margin: 0;
  padding: 10px 14px;
  color: #ffffff;
  font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
  font-size: 12px;
  line-height: 1.28;
  white-space: pre-wrap;
  word-break: break-word;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 55%);
}

.category-dialog {
  display: grid;
  gap: 14px;
  width: min(420px, calc(100vw - 48px));
  padding: 18px;
  background: #303234;
  border: 1px solid #55585c;
}

.category-dialog h2 {
  margin: 0;
  font-size: 18px;
}

.category-dialog label {
  display: grid;
  gap: 6px;
  color: #cbd1d8;
}

.category-dialog input {
  appearance: none;
  height: 34px;
  box-sizing: border-box;
  padding: 0 10px;
  color: #ffffff;
  background: #1f2022;
  border: 1px solid #55585c;
  font-family: Consolas, "Cascadia Mono", "Microsoft YaHei Mono", monospace;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.dialog-actions button {
  height: 32px;
  padding: 0 14px;
  color: #ffffff;
  background: #5f6eea;
  cursor: pointer;
}

@media (prefers-color-scheme: light) {
  .finder-shell {
    background: #f4f6f8;
    color: #1f2328;
  }

  .finder-sidebar {
    background: #eef1f5;
    border-right-color: #d5dbe3;
  }

  .category-button {
    color: #4f5b6a;
  }

  .category-button.active {
    color: #5b45d6;
  }

  .category-button:hover {
    background: #dfe5ec;
  }

  .category-remove {
    color: #7a8491;
  }

  .add-category {
    color: #4f5b6a;
  }

  .preview-open .finder-main {
    border-right-color: #d5dbe3;
  }

  .result-row {
    background: #ffffff;
    border-bottom-color: #eef1f5;
  }

  .result-row:hover,
  .result-row.selected {
    background: #e8edf4;
  }

  .result-row.selected {
    box-shadow: inset 3px 0 0 #6f7a88;
  }

  .file-name {
    color: #111827;
  }

  .file-path,
  .file-meta {
    color: #667085;
  }

  .file-icon {
    color: #4f5b6a;
  }

  .file-icon.fallback-icon {
    border-color: #b8c0cc;
    background: #eef1f5;
  }

  .empty-state,
  .preview-empty {
    color: #697386;
  }

  .finder-footer {
    background: #e9edf3;
    color: #4f5b6a;
  }

  .settings-button {
    background: transparent;
    color: #263241;
  }

  .settings-button:hover {
    background: #cdd6e3;
  }

  .sort-trigger {
    color: #1f2937;
    background: #ffffff;
    border-color: #c8d0da;
  }

  .sort-trigger:hover,
  .sort-trigger[aria-expanded="true"] {
    background: #f4f7fb;
    border-color: #aab4c2;
  }

  .sort-trigger-arrow {
    color: #667085;
  }

  .sort-menu {
    background: #ffffff;
    border-color: #c8d0da;
    box-shadow: 0 12px 28px rgb(15 23 42 / 16%);
  }

  .sort-option {
    color: #1f2937;
  }

  .sort-option:hover,
  .sort-option.active {
    color: #111827;
    background: #e9eef6;
  }

  .category-dialog input:focus,
  .category-dialog input:focus-visible {
    border-color: #8f9bad;
  }

  .toggle-track {
    background: #b9c2ce;
  }

  .toggle-track::after {
    background: #ffffff;
  }

  .preview-toggle input:checked + .toggle-track {
    background: #7b6ff0;
  }

  .result-count {
    color: #667085;
  }

  .preview-pane {
    background: #ffffff;
  }

  .preview-header {
    color: #111827;
    border-bottom-color: #d9dee7;
  }

  .preview-header span {
    color: #667085;
  }

  .preview-content {
    color: #111827;
    background: #ffffff;
  }

  .dialog-backdrop {
    background: rgb(15 23 42 / 28%);
  }

  .category-dialog {
    background: #ffffff;
    border-color: #d2d9e3;
    color: #1f2937;
    box-shadow: 0 18px 48px rgb(15 23 42 / 18%);
  }

  .category-dialog label {
    color: #4f5b6a;
  }

  .category-dialog input {
    color: #111827;
    background: #f8fafc;
    border-color: #c8d0da;
  }

  .dialog-actions button {
    color: #ffffff;
    background: #5f6eea;
  }
}

@media (max-width: 760px) {
  .finder-shell {
    grid-template-columns: 60px minmax(0, 1fr);
  }

  .finder-shell.preview-open {
    grid-template-columns: 60px minmax(180px, 0.86fr) minmax(280px, 1.14fr);
  }

  .preview-open .result-row {
    grid-template-columns: 38px minmax(0, 1fr);
    grid-template-areas:
      "icon name"
      "icon path";
  }

  .preview-open .file-meta {
    display: none;
  }

  .finder-footer {
    grid-template-columns: max-content minmax(12px, 1fr) max-content;
  }

  .preview-toggle {
    min-width: 126px;
    justify-content: flex-end;
  }

  .result-count {
    display: none;
  }
}

@media (max-width: 560px) {
  .finder-shell {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .finder-shell.preview-open {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .preview-open .preview-pane {
    display: none;
  }

  .result-row {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .file-meta {
    display: none;
  }
}
</style>
