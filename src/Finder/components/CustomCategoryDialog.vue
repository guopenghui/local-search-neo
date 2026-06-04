<script setup lang="ts">
import { ref, watch } from "vue";
import type { FinderCategory } from "../core/finderLogic";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  add: [category: Pick<FinderCategory, "label" | "rule">];
}>();

const label = ref("");
const rule = ref("");

watch(
  () => props.open,
  (open) => {
    if (open) resetForm();
  },
);

function submitCategory() {
  const trimmedLabel = label.value.trim();
  const trimmedRule = rule.value.trim();
  if (!trimmedLabel || !trimmedRule) return;

  emit("add", {
    label: trimmedLabel,
    rule: trimmedRule,
  });
}

function closeDialog() {
  resetForm();
  emit("close");
}

function resetForm() {
  label.value = "";
  rule.value = "";
}
</script>

<template>
  <div v-if="open" class="dialog-backdrop" @click.self="closeDialog">
    <form class="category-dialog" @submit.prevent="submitCategory">
      <h2>添加分类</h2>
      <label>
        <span>名称</span>
        <input v-model="label" autocomplete="off" autofocus />
      </label>
      <label>
        <span>后缀名或 Everything 规则</span>
        <input v-model="rule" autocomplete="off" placeholder="log;txt 或 path:C:\Windows" />
      </label>
      <div class="dialog-actions">
        <button type="button" @click="closeDialog">取消</button>
        <button type="submit">添加</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
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

  .category-dialog input:focus,
  .category-dialog input:focus-visible {
    border-color: #8f9bad;
  }

  .dialog-actions button {
    color: #ffffff;
    background: #5f6eea;
  }
}
</style>
