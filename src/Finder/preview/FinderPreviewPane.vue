<script setup lang="ts">
import AudioPreview from "./AudioPreview.vue";
import CodePreview from "./CodePreview.vue";
import EmptyPreview from "./EmptyPreview.vue";
import ImagePreview from "./ImagePreview.vue";
import MarkdownPreview from "./MarkdownPreview.vue";
import PdfPreview from "./PdfPreview.vue";
import TextPreview from "./TextPreview.vue";
import VideoPreview from "./VideoPreview.vue";
import type { PreviewKind } from "./previewTypes";

defineProps<{
  previewKind: PreviewKind;
  previewStatus: string;
  previewContent: string;
  previewSource: string;
  previewEncoding: string;
  previewLanguage: string;
}>();
</script>

<template>
  <aside class="preview-pane">
    <div class="preview-body">
      <TextPreview
        v-if="previewKind === 'text' && previewContent"
        :content="previewContent"
        :encoding="previewEncoding"
        :status="previewStatus"
      />
      <MarkdownPreview
        v-else-if="previewKind === 'markdown' && previewContent"
        :content="previewContent"
      />
      <CodePreview
        v-else-if="previewKind === 'code' && previewContent"
        :content="previewContent"
        :language="previewLanguage"
      />
      <PdfPreview v-else-if="previewKind === 'pdf' && previewSource" :source="previewSource" />
      <ImagePreview v-else-if="previewKind === 'image' && previewSource" :source="previewSource" />
      <VideoPreview v-else-if="previewKind === 'video' && previewSource" :source="previewSource" />
      <AudioPreview v-else-if="previewKind === 'audio' && previewSource" :source="previewSource" />
      <EmptyPreview v-else :status="previewStatus" />
    </div>
  </aside>
</template>

<style scoped>
.preview-pane {
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  background: #121315;
  user-select: text;
}

.preview-body {
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.preview-body > :deep(*) {
  min-width: 0;
  min-height: 0;
}

.preview-body > :deep(.image-preview),
.preview-body > :deep(.preview-media-shell),
.preview-body > :deep(.preview-audio-shell),
.preview-body > :deep(.text-preview),
.preview-body > :deep(.code-preview),
.preview-body > :deep(.markdown-preview),
.preview-body > :deep(.pdf-preview) {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

@media (prefers-color-scheme: light) {
  .preview-pane {
    background: #ffffff;
  }
}

@media (max-width: 560px) {
  .preview-pane {
    display: none;
  }
}
</style>
