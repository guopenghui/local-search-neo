<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
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
import { useResultActions } from "./composables/useResultActions";
import { useSubInput } from "./composables/useSubInput";
import type { FinderSortMode } from "./core/finderLogic";
import FinderPreviewPane from "./preview/FinderPreviewPane.vue";

const props = defineProps<{
  enterAction: Record<string, unknown>;
}>();

const PAGE_SIZE = 50;
const MAX_RESULTS = 100;

const queryText = ref("");
const sortMode = ref<FinderSortMode>("modified-desc");
const previewEnabled = ref(false);
const footerSortMenuOpen = ref(false);

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
  loadCustomCategories,
  selectCategory,
  handleRemoveCustomCategory,
  openCategoryDialog,
  closeCategoryDialog,
  handleAddCustomCategory,
} = useFinderCategories({ releaseFinderFocus, focusSubInput });
const {
  resultFilters,
  resultFilterCount,
  showSettingsDrawer,
  loadResultFilters,
  buildQueryFilter,
  openSettingsDrawer,
  closeSettingsDrawer,
  handleAddResultFilter,
  handleRemoveResultFilter,
} = useFinderSettings({ focusSubInput });
const { buildFilteredEverythingQuery } = useFinderQuery({
  queryText,
  activeCategory,
  buildQueryFilter,
});
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
    window.setTimeout(() => finderSearch.queueSearch(), 800);
  },
});

useFinderEnterAction({
  enterAction: () => props.enterAction,
  queryText,
  selectedPath: finderSearch.selectedPath,
  syncSubInputValue,
  queueSearch: finderSearch.queueSearch,
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
  if (activeCategoryId.value) finderSearch.queueSearch();
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
  finderSearch.queueSearch();
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
        :actions="resultActions"
        @near-bottom="finderSearch.growVisibleCount"
        @select="selectItem"
        @context-menu="contextMenu.open"
        @open="resultActions.open(finderSearch.selectedItem.value)"
      />

      <FinderFooter
        v-model:preview-enabled="previewEnabled"
        v-model:sort-mode="sortMode"
        :everything-total="finderSearch.everythingTotal.value"
        @open-settings="openSettingsDrawer"
        @request-input-focus="focusSubInput"
        @sort-menu-open-change="footerSortMenuOpen = $event"
      />
    </section>

    <FinderPreviewPane
      v-if="previewEnabled"
      :preview-kind="filePreview.previewKind.value"
      :preview-status="filePreview.previewStatus.value"
      :preview-content="filePreview.previewContent.value"
      :preview-source="filePreview.previewSource.value"
      :preview-encoding="filePreview.previewEncoding.value"
      :preview-language="filePreview.previewLanguage.value"
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
