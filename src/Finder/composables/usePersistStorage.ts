import { computed, shallowRef } from "vue";
import type { FinderCategory, FinderSortMode } from "../core/finderLogic";
import {
  buildResultFilterQuery,
  createResultFilter,
  type ResultFilter,
  type ResultFilterInput,
} from "../core/resultFilters";

interface FinderPreferences {
  previewEnabled: boolean;
  sortMode: FinderSortMode;
}

const PREFERENCES_STORAGE_KEY = "preferences";
const CUSTOM_CATEGORIES_STORAGE_KEY = "customCategories";
const RESULT_FILTERS_STORAGE_KEY = "resultFilters";

const DEFAULT_PREFERENCES: FinderPreferences = {
  previewEnabled: false,
  sortMode: "modified-desc",
};

const preferences = shallowRef<FinderPreferences>({ ...DEFAULT_PREFERENCES });
const customCategories = shallowRef<FinderCategory[]>([]);
const resultFilters = shallowRef<ResultFilter[]>([]);

const previewEnabled = computed({
  get: () => preferences.value.previewEnabled,
  set: setPreviewEnabled,
});
const sortMode = computed({
  get: () => preferences.value.sortMode,
  set: setSortMode,
});

let loaded = false;

export function usePersistStorage() {
  return {
    loadPersistStorage,
    preferences,
    previewEnabled,
    sortMode,
    customCategories,
    resultFilters,
    setPreviewEnabled,
    setSortMode,
    addCustomCategory,
    removeCustomCategory,
    addResultFilter,
    removeResultFilter,
    buildQueryFilter,
  };
}

function loadPersistStorage() {
  if (loaded) return;

  loadPreferences();
  loadCustomCategories();
  loadResultFilters();
  loaded = true;
}

function loadPreferences() {
  try {
    const stored = window.ztools.dbStorage.getItem<FinderPreferences>(PREFERENCES_STORAGE_KEY);
    if (!stored) {
      preferences.value = { ...DEFAULT_PREFERENCES };
      savePreferences();
      return;
    }

    preferences.value = { ...stored };
  } catch (error) {
    console.warn("[local-search-neo] 读取偏好设置失败:", error);
    preferences.value = { ...DEFAULT_PREFERENCES };
  }
}

function loadCustomCategories() {
  try {
    const stored = window.ztools.dbStorage.getItem<FinderCategory[]>(CUSTOM_CATEGORIES_STORAGE_KEY);
    if (!stored) {
      customCategories.value = [];
      saveCustomCategories();
      return;
    }

    customCategories.value = stored.map((category) => ({ ...category }));
  } catch (error) {
    console.warn("[local-search-neo] 读取自定义分组失败:", error);
    customCategories.value = [];
  }
}

function loadResultFilters() {
  try {
    const stored = window.ztools.dbStorage.getItem<ResultFilter[]>(RESULT_FILTERS_STORAGE_KEY);
    if (!stored) {
      resultFilters.value = [];
      saveResultFilters();
      return;
    }

    resultFilters.value = stored.map((filter) => ({
      ...filter,
      extensions: [...filter.extensions],
    }));
  } catch (error) {
    console.warn("[local-search-neo] 读取结果过滤器失败:", error);
    resultFilters.value = [];
  }
}

function setPreviewEnabled(value: boolean) {
  preferences.value = {
    ...preferences.value,
    previewEnabled: value,
  };
  savePreferences();
}

function setSortMode(value: FinderSortMode) {
  preferences.value = {
    ...preferences.value,
    sortMode: value,
  };
  savePreferences();
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

function addResultFilter(input: ResultFilterInput) {
  const filter = createResultFilter(input);
  resultFilters.value = [...resultFilters.value, filter];
  saveResultFilters();
}

function removeResultFilter(id: string) {
  resultFilters.value = resultFilters.value.filter((filter) => filter.id !== id);
  saveResultFilters();
}

function buildQueryFilter() {
  return buildResultFilterQuery(resultFilters.value);
}

function savePreferences() {
  try {
    window.ztools.dbStorage.setItem(PREFERENCES_STORAGE_KEY, {
      previewEnabled: preferences.value.previewEnabled,
      sortMode: preferences.value.sortMode,
    });
  } catch (error) {
    console.warn("[local-search-neo] 保存偏好设置失败:", error);
  }
}

function saveCustomCategories() {
  try {
    window.ztools.dbStorage.setItem(
      CUSTOM_CATEGORIES_STORAGE_KEY,
      customCategories.value.map((category) => ({ ...category })),
    );
  } catch (error) {
    console.warn("[local-search-neo] 保存自定义分组失败:", error);
  }
}

function saveResultFilters() {
  try {
    window.ztools.dbStorage.setItem(
      RESULT_FILTERS_STORAGE_KEY,
      resultFilters.value.map((filter) => ({
        ...filter,
        extensions: [...filter.extensions],
      })),
    );
  } catch (error) {
    console.warn("[local-search-neo] 保存结果过滤器失败:", error);
  }
}
