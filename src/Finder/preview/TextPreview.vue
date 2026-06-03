<script setup lang="ts">
defineProps<{
  content: string;
}>();
</script>

<template>
  <pre class="preview-content">{{ content }}</pre>
</template>

<style scoped>
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

@media (prefers-color-scheme: light) {
  .preview-content {
    color: #111827;
    background: #ffffff;
  }
}
</style>
