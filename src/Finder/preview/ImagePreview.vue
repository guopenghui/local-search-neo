<script setup lang="ts">
defineProps<{
  source: string;
}>();
</script>

<template>
  <div class="preview-media-shell">
    <img class="preview-image" :src="source" alt="" />
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

.preview-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

@media (prefers-color-scheme: light) {
  .preview-media-shell {
    background: #f8fafc;
  }
}
</style>
