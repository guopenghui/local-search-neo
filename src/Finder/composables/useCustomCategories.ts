import { ref } from "vue";
import type { FinderCategory } from "../core/finderLogic";

const CUSTOM_CATEGORY_STORAGE_KEY = "local-search-neo:finder:custom-categories";

export function useCustomCategories(storageKey = CUSTOM_CATEGORY_STORAGE_KEY) {
  const customCategories = ref<FinderCategory[]>([]);

  function loadCustomCategories() {
    try {
      const stored = window.ztools.dbStorage.getItem<FinderCategory[]>(storageKey);
      customCategories.value = Array.isArray(stored) ? stored : [];
    } catch {
      customCategories.value = [];
    }
  }

  function saveCustomCategories() {
    window.ztools.dbStorage.setItem(storageKey, customCategories.value);
  }

  function addCustomCategory(label: string, rule: string) {
    const category = {
      id: `custom-${Date.now()}`,
      label,
      kind: "custom",
      rule,
    } satisfies FinderCategory;

    customCategories.value = [...customCategories.value, category];
    saveCustomCategories();
    return category;
  }

  function removeCustomCategory(category: FinderCategory) {
    customCategories.value = customCategories.value.filter((item) => item.id !== category.id);
    saveCustomCategories();
  }

  return {
    customCategories,
    loadCustomCategories,
    addCustomCategory,
    removeCustomCategory,
  };
}
