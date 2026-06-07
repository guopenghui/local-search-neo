<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useGlocalConfirmDialog } from "../components/useGlocalConfirmDialog";
import ContextMenu from "./components/ContextMenu.vue";

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
import type { FinderCategory } from "./core/finderLogic";
import FinderPreviewPane from "./preview/FinderPreviewPane.vue";

const PAGE_SIZE = 30;
const MAX_RESULTS = 600;

const footerSortMenuOpen = ref(false);
const { previewEnabled, sortMode, matchPathEnabled } = usePersistStorage();

const { bindSubInput, syncSubInputValue, focusSubInput } = useSubInput({
  onInput: queueSearch,
});

const { releaseFinderFocus } = useFinderFocus(focusSubInput);
const {
  activeCategoryId,
  activeCategory,
  enabledCategories,
  allCategories,
  selectCategory: setActiveCategory,
  handleAddCustomCategory,
  handleUpdateCustomCategory,
  handleRemoveCustomCategory,
  handleSetCategoryEnabled,
} = useFinderCategories();
const { showSettingsDrawer, openSettingsDrawer, closeSettingsDrawer } = useFinderSettings({
  focusSubInput,
});
const { buildFilteredEverythingQuery } = useFinderQuery();
const isFolderQuery = computed(() => /(?:^|\s)folder:/i.test(buildFilteredEverythingQuery()));
const finderSearch = useFinderSearch({
  pageSize: PAGE_SIZE,
  maxResults: MAX_RESULTS,
  sortMode,
  matchPathEnabled,
  buildQuery: buildFilteredEverythingQuery,
  onSelectionRestored: scrollSelectedIntoView,
});
const filePreview = useFilePreview({
  selectedItem: finderSearch.selectedItem,
  previewEnabled,
});
const contextMenu = useContextMenu();
const confirmDialog = useGlocalConfirmDialog();
const resultActions = useResultActions({
  onTrashed: (fullPath) => {
    finderSearch.removeResultByPath(fullPath);
    finderSearch.runSearch();
  },
});

useFinderEnterAction({
  selectedPath: finderSearch.selectedPath,
  search: finderSearch.runSearch,
});

useFinderKeyboard({
  isNavigationBlocked: () =>
    showSettingsDrawer.value || footerSortMenuOpen.value || contextMenu.visible.value,
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

watch(
  [() => activeCategory.value.id, () => activeCategory.value.rule, sortMode, matchPathEnabled],
  () => {
    finderSearch.resetVisibleCount();
    finderSearch.runSearch();
  },
);

onMounted(() => {
  // window.ztools.setExpendHeight(650);
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

function selectCategory(category: FinderCategory) {
  setActiveCategory(category);
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
      :categories="enabledCategories"
      :active-category-id="activeCategoryId"
      @select="selectCategory"
      @open-settings="openSettingsDrawer"
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

    <SettingsDrawer
      :open="showSettingsDrawer"
      :categories="allCategories"
      :match-path-enabled="matchPathEnabled"
      @close="closeSettingsDrawer"
      @add-category="handleAddCustomCategory"
      @update-category="handleUpdateCustomCategory"
      @remove-category="handleRemoveCustomCategory"
      @set-category-enabled="handleSetCategoryEnabled"
      @set-match-path-enabled="matchPathEnabled = $event"
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
