<script setup lang="ts">
import { ref, watch } from "vue";
import {
  formatFilterExtensions,
  type ResultFilter,
  type ResultFilterInput,
} from "../core/resultFilters";

const props = defineProps<{
  open: boolean;
  filters: ResultFilter[];
  resultFiltersEnabled: boolean;
}>();

const emit = defineEmits<{
  close: [];
  addResultFilter: [filter: ResultFilterInput];
  removeResultFilter: [id: string];
  setResultFiltersEnabled: [enabled: boolean];
  toggleResultFilter: [id: string, enabled: boolean];
}>();

const directory = ref("");
const extensions = ref("");

watch(
  () => props.open,
  (open) => {
    if (open) resetForm();
  },
);

function submitFilter() {
  emit("addResultFilter", {
    directory: directory.value,
    extensions: extensions.value,
  });
  resetForm();
}

function resetForm() {
  directory.value = "";
  extensions.value = "";
}

function closeDrawer() {
  resetForm();
  emit("close");
}

function displayDirectory(directory: string) {
  return directory || "*";
}

function handleResultFiltersEnabledChange(event: Event) {
  emit("setResultFiltersEnabled", readChecked(event));
}

function handleFilterEnabledChange(id: string, event: Event) {
  emit("toggleResultFilter", id, readChecked(event));
}

function readChecked(event: Event) {
  return event.target instanceof HTMLInputElement && event.target.checked;
}
</script>

<template>
  <Transition name="settings-panel" appear>
    <div v-if="open" class="settings-layer">
      <div class="settings-backdrop" @click="closeDrawer"></div>
      <section class="settings-drawer" aria-label="设置">
        <header class="settings-header">
          <div>
            <h2>设置</h2>
          </div>
          <button type="button" class="drawer-close" @click="closeDrawer">×</button>
        </header>

        <section class="settings-section">
          <div class="filter-section-header">
            <div>
              <h3>结果过滤器</h3>
              <p>隐藏指定目录下的指定后缀。留空表示 *。</p>
            </div>
            <label class="filter-switch master-filter-switch">
              <input
                type="checkbox"
                :checked="resultFiltersEnabled"
                @change="handleResultFiltersEnabledChange"
              />
              <span class="switch-track"></span>
              <span>启用过滤</span>
            </label>
          </div>

          <form class="filter-form" @submit.prevent="submitFilter">
            <label>
              <span>目录路径</span>
              <input
                v-model="directory"
                autocomplete="off"
                placeholder="例如 C:\Windows\Temp，留空为 *"
              />
            </label>
            <label>
              <span>后缀名</span>
              <input v-model="extensions" autocomplete="off" placeholder="例如 log;tmp，留空为 *" />
            </label>
            <button type="submit">添加过滤器</button>
          </form>

          <div class="filter-list">
            <div class="filter-list-header">
              <span>启用</span>
              <span>目录</span>
              <span>后缀</span>
              <span></span>
            </div>
            <div v-if="filters.length === 0" class="empty-filter">暂无过滤器</div>
            <div
              v-for="filter in filters"
              :key="filter.id"
              class="filter-row"
              :class="{ disabled: !resultFiltersEnabled || !filter.enabled }"
            >
              <label class="filter-switch compact-filter-switch" title="启用该过滤器">
                <input
                  type="checkbox"
                  :checked="filter.enabled"
                  :disabled="!resultFiltersEnabled"
                  @change="handleFilterEnabledChange(filter.id, $event)"
                />
                <span class="switch-track"></span>
              </label>
              <span class="filter-directory" :title="displayDirectory(filter.directory)">{{
                displayDirectory(filter.directory)
              }}</span>
              <span class="filter-extensions">{{ formatFilterExtensions(filter.extensions) }}</span>
              <button type="button" @click="emit('removeResultFilter', filter.id)">删除</button>
            </div>
          </div>
        </section>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.settings-layer {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  align-items: end;
}

.settings-backdrop {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 35%);
}

.settings-drawer {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  position: relative;
  width: 100%;
  height: 75vh;
  max-height: 75vh;
  box-sizing: border-box;
  padding: 18px 20px 20px;
  overflow: hidden;
  color: #f5f7fa;
  background: #2d2f32;
  border-top: 1px solid #55585c;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -16px 40px rgb(0 0 0 / 35%);
}

.settings-panel-enter-active,
.settings-panel-leave-active {
  transition: background-color 0.28s ease;
}

.settings-panel-enter-active .settings-backdrop,
.settings-panel-leave-active .settings-backdrop {
  transition: opacity 0.28s ease;
}

.settings-panel-enter-active .settings-drawer {
  transition:
    transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.24s ease;
  will-change: transform, opacity;
}

.settings-panel-leave-active .settings-drawer {
  transition:
    transform 0.22s cubic-bezier(0.32, 0, 0.67, 0),
    opacity 0.14s ease 0.08s;
  will-change: transform, opacity;
}

.settings-panel-enter-from .settings-backdrop,
.settings-panel-leave-to .settings-backdrop {
  opacity: 0;
}

.settings-panel-enter-from .settings-drawer {
  opacity: 0;
  transform: translate3d(0, 100%, 0);
}

.settings-panel-leave-to .settings-drawer {
  opacity: 0.96;
  transform: translate3d(0, 105%, 0);
}

.settings-panel-enter-to .settings-drawer,
.settings-panel-leave-from .settings-drawer {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.settings-header h2 {
  margin: 0;
  font-size: 18px;
}

.settings-header p {
  margin: 6px 0 0;
  color: #aeb4bb;
  font-size: 12px;
}

.drawer-close,
.filter-row button,
.filter-form button {
  border: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.drawer-close {
  width: 30px;
  height: 30px;
  background: transparent;
  border-radius: 6px;
  color: #cbd1d8;
  font-size: 24px;
  line-height: 1;
}

.settings-section {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.settings-section h3 {
  margin: 0;
  color: #ffffff;
  font-size: 15px;
}

.settings-section p {
  margin: 0;
  color: #aeb4bb;
  font-size: 12px;
}

.filter-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.filter-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #cbd1d8;
  font-size: 12px;
  cursor: pointer;
}

.filter-switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  position: relative;
  width: 32px;
  height: 16px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #6c7178;
  transition: background-color 0.15s ease;
}

.switch-track::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #f2f4f7;
  transition: transform 0.15s ease;
}

.filter-switch input:checked + .switch-track {
  background: #30a1d3;
}

.filter-switch input:checked + .switch-track::after {
  transform: translateX(16px);
}

.filter-switch input:disabled + .switch-track {
  opacity: 0.45;
}

.master-filter-switch {
  white-space: nowrap;
}

.compact-filter-switch {
  justify-self: start;
}

.filter-form {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(160px, 280px) max-content;
  align-items: end;
  gap: 12px;
}

.filter-form label {
  display: grid;
  gap: 6px;
  color: #cbd1d8;
  font-size: 12px;
}

.filter-form input {
  appearance: none;
  height: 34px;
  box-sizing: border-box;
  padding: 0 10px;
  color: #ffffff;
  background: #1f2022;
  border: 1px solid #55585c;
  border-radius: 6px;
  font-family: Consolas, "Cascadia Mono", "Microsoft YaHei Mono", monospace;
}

.filter-form input:focus,
.filter-form input:focus-visible,
.filter-form button:focus,
.filter-form button:focus-visible,
.filter-row button:focus,
.filter-row button:focus-visible,
.drawer-close:focus,
.drawer-close:focus-visible {
  outline: none;
  box-shadow: none;
}

.filter-form input:focus,
.filter-form input:focus-visible {
  border-color: #6b7078;
}

.filter-form button {
  height: 34px;
  padding: 0 14px;
  background: #5f6eea;
  border-radius: 6px;
}

.filter-list {
  display: grid;
  overflow: hidden;
  border: 1px solid #47494c;
  border-radius: 8px;
}

.filter-list-header,
.filter-row {
  display: grid;
  grid-template-columns: 46px minmax(180px, 1fr) minmax(120px, 220px) 64px;
  gap: 10px;
  align-items: center;
  min-height: 34px;
  padding: 0 10px;
}

.filter-list-header {
  color: #aeb4bb;
  background: #242629;
  font-size: 12px;
}

.filter-row {
  border-top: 1px solid #3f4246;
  background: #303234;
  font-size: 13px;
}

.filter-row.disabled .filter-directory,
.filter-row.disabled .filter-extensions {
  opacity: 0.5;
}

.filter-directory {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-directory,
.filter-extensions {
  font-family: Consolas, "Cascadia Mono", "Microsoft YaHei Mono", monospace;
}

.filter-extensions {
  color: #d7dce3;
}

.filter-row button {
  height: 26px;
  color: #ffb4b4;
  background: transparent;
  border-radius: 5px;
}

.empty-filter {
  display: grid;
  min-height: 72px;
  place-items: center;
  color: #a6abb2;
  border-top: 1px solid #3f4246;
}

@media (prefers-color-scheme: light) {
  .settings-backdrop {
    background: rgb(15 23 42 / 24%);
  }

  .settings-drawer {
    color: #1f2937;
    background: #ffffff;
    border-top-color: #d2d9e3;
    box-shadow: 0 -16px 40px rgb(15 23 42 / 16%);
  }

  .settings-header h2,
  .settings-section h3 {
    color: #111827;
  }

  .settings-section p,
  .settings-header p,
  .empty-filter {
    color: #667085;
  }

  .drawer-close {
    color: #4f5b6a;
  }

  .drawer-close:hover {
    background: #edf2f7;
  }

  .filter-form label,
  .filter-switch {
    color: #4f5b6a;
  }

  .switch-track {
    background: #b9c2ce;
  }

  .filter-switch input:checked + .switch-track {
    background: #167fae;
  }

  .filter-form input {
    color: #111827;
    background: #f8fafc;
    border-color: #c8d0da;
  }

  .filter-form input:focus,
  .filter-form input:focus-visible {
    border-color: #8f9bad;
  }

  .filter-form button {
    color: #ffffff;
    background: #5f6eea;
  }

  .filter-list {
    border-color: #d6dde8;
  }

  .filter-list-header {
    color: #667085;
    background: #eef2f7;
  }

  .filter-row {
    color: #1f2937;
    background: #ffffff;
    border-top-color: #e4e9f1;
  }

  .filter-extensions {
    color: #4f5b6a;
  }

  .filter-row button {
    color: #c24141;
  }

  .empty-filter {
    border-top-color: #e4e9f1;
  }
}

@media (max-width: 680px) {
  .filter-form,
  .filter-list-header,
  .filter-row {
    grid-template-columns: 1fr;
  }

  .filter-list-header {
    display: none;
  }

  .filter-row {
    gap: 4px;
    padding: 8px 10px;
  }
}
</style>
