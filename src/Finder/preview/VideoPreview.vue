<script setup lang="ts">
defineProps<{
  source: string;
}>();
</script>

<template>
  <div class="preview-media-shell">
    <video class="preview-video" :src="source" controls preload="metadata"></video>
  </div>
</template>

<style scoped>
.preview-media-shell {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  padding: 12px;
  overflow: auto;
  background: #0f1012;
}

.preview-video {
  display: block;
  width: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background: #000000;
}

@media (prefers-color-scheme: light) {
  .preview-media-shell {
    background: #f8fafc;
  }
}
</style>
