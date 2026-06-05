<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useConfirmDialog } from "../components/useConfirmDialog";
import ContextMenu from "./components/ContextMenu.vue";
import CustomCategoryDialog from "./components/CustomCategoryDialog.vue";
import FinderFooter from "./components/FinderFooter.vue";
import FinderResultList from "./components/FinderResultList.vue";
import FinderSidebar from "./components/FinderSidebar.vue";
import SettingsDrawer from "./components/SettingsDrawer.vue";
import { useContextMenu } from "./composables/useContextMenu";
import { useFilePreview } from "./composables/useFilePreview";
import { useFinderCategories } from "./composables/useFinderCategories";
import { useFinderEnterAction } from "./composables/useFinderEnterAction";
import { useFinderFocus } from "./composables/useFinderFocus";
import { useFinderKeyboard } from "./composables/useFinderKeyboard";
import { useFinderQuery } from "./composables/useFinderQuery";
import { useFinderSearch } from "./composables/useFinderSearch";
import { useFinderSettings } from "./composables/useFinderSettings";
import { usePersistStorage } from "./composables/usePersistStorage";
import { useResultActions } from "./composables/useResultActions";
import { useSubInput } from "./composables/useSubInput";
import FinderPreviewPane from "./preview/FinderPreviewPane.vue";

const props = defineProps<{
  enterAction: Record<string, unknown>;
}>();

const PAGE_SIZE = 50;
const MAX_RESULTS = 100;

const queryText = ref("");
const footerSortMenuOpen = ref(false);
const { loadPersistStorage, previewEnabled, sortMode } = usePersistStorage();

const { bindSubInput, syncSubInputValue, focusSubInput } = useSubInput({
  queryText,
  onInput: queueSearch,
});

const { releaseFinderFocus } = useFinderFocus(focusSubInput);
const {
  activeCategoryId,
  activeCategory,
  categories,
  showCategoryDialog,
  selectCategory,
  handleRemoveCustomCategory,
  openCategoryDialog,
  closeCategoryDialog,
  handleAddCustomCategory,
} = useFinderCategories({ releaseFinderFocus, focusSubInput });
const {
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
} = useFinderSettings({ focusSubInput });
const { buildFilteredEverythingQuery } = useFinderQuery({
  queryText,
  activeCategory,
  buildQueryFilter,
});
const isFolderQuery = computed(() => /(?:^|\s)folder:/i.test(buildFilteredEverythingQuery()));
const finderSearch = useFinderSearch({
  pageSize: PAGE_SIZE,
  maxResults: MAX_RESULTS,
  sortMode,
  resultFilterCount,
  buildQuery: buildFilteredEverythingQuery,
  onSelectionRestored: scrollSelectedIntoView,
});
const filePreview = useFilePreview({
  selectedItem: finderSearch.selectedItem,
  previewEnabled,
});
const contextMenu = useContextMenu();
const confirmDialog = useConfirmDialog();
const resultActions = useResultActions({
  confirm: confirmDialog.confirm,
  onTrashed: (fullPath) => {
    finderSearch.removeResultByPath(fullPath);
    finderSearch.runSearch();
  },
});

useFinderEnterAction({
  enterAction: () => props.enterAction,
  queryText,
  selectedPath: finderSearch.selectedPath,
  syncSubInputValue,
  search: finderSearch.runSearch,
});

useFinderKeyboard({
  isNavigationBlocked: () =>
    showCategoryDialog.value ||
    showSettingsDrawer.value ||
    footerSortMenuOpen.value ||
    contextMenu.visible.value,
  closeTransientOverlays: contextMenu.close,
  focusSubInput,
  moveSelection: finderSearch.moveSelection,
  openSelection: () => resultActions.open(finderSearch.selectedItem.value),
  showSelectionInFolder: () => {
    const selectedItem = finderSearch.selectedItem.value;
    if (selectedItem) resultActions.showInFolder(selectedItem);
  },
  scrollSelectedIntoView,
});

watch([activeCategoryId, sortMode], () => {
  finderSearch.resetVisibleCount();
  if (activeCategoryId.value) finderSearch.runSearch();
});

watch([resultFilters, resultFilterCount], () => {
  finderSearch.resetVisibleCount();
  finderSearch.runSearch();
});

onMounted(() => {
  window.ztools.setExpendHeight(650);
  loadPersistStorage();
  bindSubInput();
  syncSubInputValue();
  finderSearch.runSearch();
});

function queueSearch() {
  finderSearch.queueSearch();
}

function selectItem(item: { fullPath?: string }) {
  finderSearch.selectedPath.value = item.fullPath ?? "";
  releaseFinderFocus();
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

function openImagePreviewMenu(event: MouseEvent) {
  const imagePath = finderSearch.selectedItem.value?.fullPath ?? "";
  contextMenu.open(event, [
    {
      id: "copy-preview-image",
      label: "复制图片",
      disabled: !imagePath,
      action: () => {
        window.ztools.copyImage(imagePath);
      },
    },
  ]);
}
</script>

<template>
  <main class="finder-shell" :class="{ 'preview-open': previewEnabled }">
    <FinderSidebar
      :categories="categories"
      :active-category-id="activeCategoryId"
      @select="selectCategory"
      @context-menu="contextMenu.open"
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
        :is-folder-query="isFolderQuery"
        :actions="resultActions"
        @near-bottom="finderSearch.growVisibleCount"
        @select="selectItem"
        @context-menu="contextMenu.open"
        @open="resultActions.open(finderSearch.selectedItem.value)"
      />
    </section>

    <FinderFooter
      class="finder-footer-bar"
      :everything-total="finderSearch.everythingTotal.value"
      @open-settings="openSettingsDrawer"
      @request-input-focus="focusSubInput"
      @sort-menu-open-change="footerSortMenuOpen = $event"
    />

    <FinderPreviewPane
      v-if="previewEnabled"
      :preview-kind="filePreview.previewKind.value"
      :preview-status="filePreview.previewStatus.value"
      :preview-content="filePreview.previewContent.value"
      :preview-source="filePreview.previewSource.value"
      :preview-encoding="filePreview.previewEncoding.value"
      :preview-language="filePreview.previewLanguage.value"
      @image-context-menu="openImagePreviewMenu"
    />

    <CustomCategoryDialog
      :open="showCategoryDialog"
      @close="closeCategoryDialog"
      @add="handleAddCustomCategory"
    />

    <SettingsDrawer
      :open="showSettingsDrawer"
      :filters="resultFilters"
      :result-filters-enabled="resultFiltersEnabled"
      @close="closeSettingsDrawer"
      @add-result-filter="handleAddResultFilter"
      @remove-result-filter="handleRemoveResultFilter"
      @set-result-filters-enabled="handleSetResultFiltersEnabled"
      @toggle-result-filter="handleToggleResultFilter"
    />

    <ContextMenu
      :visible="contextMenu.visible.value"
      :x="contextMenu.x.value"
      :y="contextMenu.y.value"
      :items="contextMenu.items.value"
      @select="contextMenu.select"
    />

    <ConfirmDialog
      :open="confirmDialog.state.open"
      :title="confirmDialog.state.title"
      :message="confirmDialog.state.message"
      :confirm-text="confirmDialog.state.confirmText"
      :cancel-text="confirmDialog.state.cancelText"
      :danger="confirmDialog.state.danger"
      @confirm="confirmDialog.accept"
      @cancel="confirmDialog.cancel"
    />
  </main>
</template>

<style scoped>
.finder-shell {
  --result-list-width: 315px;

  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) 42px;
  height: 100vh;
  min-height: 0;
  max-height: 100vh;
  overflow: hidden;
  background: #2f3133;
  color: #f5f7fa;
  font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
  user-select: none;
}

.finder-shell.preview-open {
  grid-template-columns: 64px var(--result-list-width) minmax(0, 1fr);
}

.finder-sidebar {
  grid-row: 1 / -1;
}

.finder-main {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  overflow: visible;
}

.preview-pane {
  grid-column: 3;
  grid-row: 1;
}

.finder-footer-bar {
  grid-column: 2 / -1;
  grid-row: 2;
  min-width: 0;
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
    --result-list-width: 270px;

    grid-template-columns: 60px minmax(0, 1fr);
  }

  .finder-shell.preview-open {
    grid-template-columns: 60px var(--result-list-width) minmax(0, 1fr);
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
