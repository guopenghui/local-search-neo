import { computed, ref } from "vue";
import { DEFAULT_CATEGORIES, type FinderCategory } from "../core/finderLogic";
import { usePersistStorage } from "./usePersistStorage";

interface UseFinderCategoriesOptions {
  releaseFinderFocus: () => void;
  focusSubInput: () => void;
}

export function useFinderCategories({
  releaseFinderFocus,
  focusSubInput,
}: UseFinderCategoriesOptions) {
  const activeCategoryId = ref("all");
  const showCategoryDialog = ref(false);
  const { customCategories, addCustomCategory, removeCustomCategory } = usePersistStorage();

  const categories = computed(() => [...DEFAULT_CATEGORIES, ...customCategories.value]);
  const activeCategory = computed(
    () =>
      categories.value.find((category) => category.id === activeCategoryId.value) ??
      DEFAULT_CATEGORIES[0],
  );

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

  return {
    activeCategoryId,
    activeCategory,
    categories,
    showCategoryDialog,
    selectCategory,
    handleRemoveCustomCategory,
    openCategoryDialog,
    closeCategoryDialog,
    handleAddCustomCategory,
  };
}
