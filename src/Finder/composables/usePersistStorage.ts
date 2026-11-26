import { computed, shallowRef } from "vue";
import {
  DEFAULT_CATEGORY_ORDER,
  type FinderCategory,
  type FinderSortMode,
  normalizeCategoryOrder,
} from "../core/finderLogic";
import {
  DEFAULT_MEDIA_AUTOPLAY_MODE,
  normalizeMediaAutoplayMode,
  type MediaAutoplayMode,
} from "../core/mediaAutoplay";

interface FinderPreferences {
  previewEnabled: boolean;
  sortMode: FinderSortMode;
  matchPathEnabled: boolean;
  mediaAutoplayMode: MediaAutoplayMode;
  resultListWidth: number;
  sidebarWidth: number;
  categoryEnabled: Record<string, boolean>;
  categoryOrder: string[];
}

/** 旧版本只有布尔开关 `autoPlayAudio`，读取时用于平滑迁移。 */
type StoredPreferences = Partial<FinderPreferences> & { autoPlayAudio?: boolean };

const PREFERENCES_STORAGE_KEY = "preferences";
const CUSTOM_CATEGORIES_STORAGE_KEY = "customCategories";

const DEFAULT_PREFERENCES: FinderPreferences = {
  previewEnabled: false,
  sortMode: "modified-desc",
  matchPathEnabled: true,
  mediaAutoplayMode: DEFAULT_MEDIA_AUTOPLAY_MODE,
  resultListWidth: 315,
  sidebarWidth: 64,
  categoryEnabled: {},
  categoryOrder: [...DEFAULT_CATEGORY_ORDER],
};

const preferences = shallowRef<FinderPreferences>({ ...DEFAULT_PREFERENCES });
const customCategories = shallowRef<FinderCategory[]>([]);

const previewEnabled = computed({
  get: () => preferences.value.previewEnabled,
  set: setPreviewEnabled,
});
const sortMode = computed({
  get: () => preferences.value.sortMode,
  set: setSortMode,
});
const matchPathEnabled = computed({
  get: () => preferences.value.matchPathEnabled,
  set: setMatchPathEnabled,
});
const mediaAutoplayMode = computed({
  get: () => preferences.value.mediaAutoplayMode,
  set: setMediaAutoplayMode,
});
const resultListWidth = computed({
  get: () => preferences.value.resultListWidth,
  set: setResultListWidth,
});
const sidebarWidth = computed({
  get: () => preferences.value.sidebarWidth,
  set: setSidebarWidth,
});
const categoryOrder = computed(() => preferences.value.categoryOrder);

let loaded = false;

export function usePersistStorage() {
  return {
    loadPersistStorage,
    previewEnabled,
    sortMode,
    matchPathEnabled,
    mediaAutoplayMode,
    setMediaAutoplayMode,
    resultListWidth,
    setResultListWidth,
    sidebarWidth,
    setSidebarWidth,
    categoryOrder,
    setCategoryOrder,
    resetCategoryOrder,
    customCategories,
    addCustomCategory,
    updateCustomCategory,
    removeCustomCategory,
    isCategoryEnabled,
    setCategoryEnabled,
  };
}

function loadPersistStorage() {
  if (loaded) return;

  loadPreferences();
  loadCustomCategories();
  loaded = true;
}

function loadPreferences() {
  try {
    const stored = window.ztools.dbStorage.getItem<StoredPreferences>(PREFERENCES_STORAGE_KEY);
    if (!stored) {
      preferences.value = { ...DEFAULT_PREFERENCES };
      savePreferences();
      return;
    }

    preferences.value = normalizePreferences(stored);
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

    customCategories.value = stored.map(normalizeCustomCategory);
  } catch (error) {
    console.warn("[local-search-neo] 读取自定义分组失败:", error);
    customCategories.value = [];
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

function setMatchPathEnabled(value: boolean) {
  preferences.value = {
    ...preferences.value,
    matchPathEnabled: value,
  };
  savePreferences();
}

function setMediaAutoplayMode(value: MediaAutoplayMode) {
  preferences.value = {
    ...preferences.value,
    mediaAutoplayMode: normalizeMediaAutoplayMode(value),
  };
  savePreferences();
}

function setResultListWidth(value: number, persist = true) {
  if (typeof value !== "number" || Number.isNaN(value)) return;
  preferences.value = {
    ...preferences.value,
    resultListWidth: Math.round(value),
  };
  if (persist) {
    savePreferences();
  }
}

function setSidebarWidth(value: number, persist = true) {
  if (typeof value !== "number" || Number.isNaN(value)) return;
  preferences.value = {
    ...preferences.value,
    sidebarWidth: Math.round(value),
  };
  if (persist) {
    savePreferences();
  }
}

function setCategoryOrder(order: string[]) {
  preferences.value = {
    ...preferences.value,
    categoryOrder: [...order],
  };
  savePreferences();
}

function resetCategoryOrder(allAvailableCategoryIds: string[]) {
  preferences.value = {
    ...preferences.value,
    categoryOrder: normalizeCategoryOrder(DEFAULT_CATEGORY_ORDER, allAvailableCategoryIds),
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
  preferences.value = {
    ...preferences.value,
    categoryEnabled: {
      ...preferences.value.categoryEnabled,
      [category.id]: true,
    },
    categoryOrder: [...preferences.value.categoryOrder, category.id],
  };
  savePreferences();
  saveCustomCategories();
  return category;
}

function updateCustomCategory(id: string, input: Pick<FinderCategory, "label" | "rule">) {
  customCategories.value = customCategories.value.map((category) =>
    category.id === id
      ? {
          ...category,
          label: input.label,
          rule: input.rule,
        }
      : category,
  );
  saveCustomCategories();
}

function removeCustomCategory(category: FinderCategory) {
  customCategories.value = customCategories.value.filter((item) => item.id !== category.id);
  const { [category.id]: _removed, ...categoryEnabled } = preferences.value.categoryEnabled;
  preferences.value = {
    ...preferences.value,
    categoryEnabled,
    categoryOrder: preferences.value.categoryOrder.filter((id) => id !== category.id),
  };
  savePreferences();
  saveCustomCategories();
}

function isCategoryEnabled(categoryId: string) {
  return preferences.value.categoryEnabled[categoryId] ?? true;
}

function setCategoryEnabled(categoryId: string, enabled: boolean) {
  preferences.value = {
    ...preferences.value,
    categoryEnabled: {
      ...preferences.value.categoryEnabled,
      [categoryId]: enabled,
    },
  };
  savePreferences();
}

function normalizePreferences(stored: StoredPreferences): FinderPreferences {
  const rawOrder = Array.isArray(stored.categoryOrder)
    ? stored.categoryOrder.filter((item): item is string => typeof item === "string")
    : [...DEFAULT_CATEGORY_ORDER];

  return {
    previewEnabled: stored.previewEnabled ?? DEFAULT_PREFERENCES.previewEnabled,
    sortMode: stored.sortMode ?? DEFAULT_PREFERENCES.sortMode,
    matchPathEnabled: stored.matchPathEnabled ?? DEFAULT_PREFERENCES.matchPathEnabled,
    mediaAutoplayMode: normalizeStoredMediaAutoplayMode(stored),
    resultListWidth:
      typeof stored.resultListWidth === "number" && stored.resultListWidth >= 200
        ? stored.resultListWidth
        : DEFAULT_PREFERENCES.resultListWidth,
    sidebarWidth:
      typeof stored.sidebarWidth === "number" && stored.sidebarWidth >= 48
        ? stored.sidebarWidth
        : DEFAULT_PREFERENCES.sidebarWidth,
    categoryEnabled: { ...DEFAULT_PREFERENCES.categoryEnabled, ...stored.categoryEnabled },
    categoryOrder: rawOrder,
  };
}

/**
 * 读取音视频自动播放策略，并兼容旧版本的布尔开关 `autoPlayAudio`。
 *
 * 旧版默认开启且语义是「选中即播放」，正是用户反馈的打扰来源，因此旧值 true 一律升级为
 * 新的默认策略（首次点击后自动播放）；只有明确关掉过的用户继续保留「仅点击播放」。
 */
function normalizeStoredMediaAutoplayMode(stored: StoredPreferences): MediaAutoplayMode {
  if (stored.mediaAutoplayMode !== undefined) {
    return normalizeMediaAutoplayMode(stored.mediaAutoplayMode);
  }
  return stored.autoPlayAudio === false ? "click" : DEFAULT_MEDIA_AUTOPLAY_MODE;
}

function normalizeCustomCategory(category: FinderCategory): FinderCategory {
  return {
    id: category.id,
    label: category.label,
    kind: "custom",
    rule: category.rule,
  };
}

function savePreferences() {
  try {
    window.ztools.dbStorage.setItem(PREFERENCES_STORAGE_KEY, preferences.value);
  } catch (error) {
    console.warn("[local-search-neo] 保存偏好设置失败:", error);
  }
}

function saveCustomCategories() {
  try {
    window.ztools.dbStorage.setItem(
      CUSTOM_CATEGORIES_STORAGE_KEY,
      customCategories.value.map(normalizeCustomCategory),
    );
  } catch (error) {
    console.warn("[local-search-neo] 保存自定义分组失败:", error);
  }
}
