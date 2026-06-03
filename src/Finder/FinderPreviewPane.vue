<script setup lang="ts">
defineProps<{
  previewStatus: string;
  previewContent: string;
}>();
</script>

<template>
  <aside class="preview-pane">
    <header class="preview-header">
      <span class="preview-encoding">UTF-8</span>
      <span>{{ previewStatus }}</span>
    </header>
    <pre v-if="previewContent" class="preview-content">{{ previewContent }}</pre>
    <div v-else class="preview-empty">{{ previewStatus }}</div>
  </aside>
</template>

<style scoped>
.preview-pane {
  display: grid;
  grid-template-rows: 30px minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  background: #121315;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  padding: 0 12px;
  color: #ffffff;
  border-bottom: 1px solid #282a2d;
  font-size: 12px;
}

.preview-encoding {
  color: #9ba1a8;
  font-family: Consolas, "Cascadia Mono", monospace;
}

.preview-header span:last-child {
  margin-left: auto;
  color: #c3c8cf;
  white-space: nowrap;
}

.preview-content {
  overflow: auto;
  margin: 0;
  padding: 10px 14px;
  color: #ffffff;
  font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
  font-size: 12px;
  line-height: 1.28;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  color: #a6abb2;
}

@media (prefers-color-scheme: light) {
  .preview-pane {
    background: #ffffff;
  }

  .preview-header {
    color: #111827;
    border-bottom-color: #d9dee7;
  }

  .preview-header span:last-child {
    color: #667085;
  }

  .preview-content {
    color: #111827;
    background: #ffffff;
  }

  .preview-empty {
    color: #697386;
  }
}

@media (max-width: 560px) {
  .preview-pane {
    display: none;
  }
}
</style>
