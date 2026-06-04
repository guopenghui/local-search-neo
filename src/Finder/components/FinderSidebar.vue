<script setup lang="ts">
import { computed } from "vue";
import type { ContextMenuItem } from "../composables/useContextMenu";
import type { FinderCategory } from "../core/finderLogic";

const props = defineProps<{
  categories: FinderCategory[];
  activeCategoryId: string;
}>();

const emit = defineEmits<{
  select: [category: FinderCategory];
  "context-menu": [event: MouseEvent, items: ContextMenuItem[]];
  remove: [category: FinderCategory];
  add: [];
}>();

const builtInCategories = computed(() =>
  props.categories.filter((category) => category.kind !== "custom"),
);
const customCategories = computed(() =>
  props.categories.filter((category) => category.kind === "custom"),
);

function openCategoryMenu(event: MouseEvent, category: FinderCategory) {
  emit("context-menu", event, [
    {
      id: "delete-category",
      label: "删除分组",
      danger: true,
      action: () => emit("remove", category),
    },
  ]);
}
</script>

<template>
  <aside class="finder-sidebar">
    <button
      v-for="category in builtInCategories"
      :key="category.id"
      class="category-button"
      :class="{ active: category.id === activeCategoryId }"
      tabindex="-1"
      @mousedown.left.prevent
      @click="emit('select', category)"
    >
      <span>{{ category.label }}</span>
    </button>

    <div v-if="customCategories.length > 0" class="category-separator"></div>

    <button
      v-for="category in customCategories"
      :key="category.id"
      class="category-button custom-category-button"
      :class="{ active: category.id === activeCategoryId }"
      tabindex="-1"
      @mousedown.left.prevent
      @contextmenu.prevent.stop="openCategoryMenu($event, category)"
      @click="emit('select', category)"
    >
      <span>{{ category.label }}</span>
    </button>

    <button
      class="add-category"
      title="添加分类"
      tabindex="-1"
      @mousedown.left.prevent
      @click="emit('add')"
    >
      +
    </button>
  </aside>
</template>

<style scoped>
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
.add-category {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.category-button:focus,
.category-button:focus-visible,
.add-category:focus,
.add-category:focus-visible {
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

.custom-category-button {
  color: #d4d8df;
}

.category-separator {
  height: 1px;
  margin: 6px 6px;
  background: #444a53;
}

.add-category {
  margin-top: auto;
  height: 34px;
  color: #d5d9df;
  cursor: pointer;
  font-size: 22px;
}

@media (prefers-color-scheme: light) {
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

  .custom-category-button {
    color: #374151;
  }

  .category-separator {
    background: #d7dee8;
  }

  .add-category {
    color: #4f5b6a;
  }
}
</style>
