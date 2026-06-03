<script setup lang="ts">
import { computed } from "vue";
import AudioPreview from "./preview/AudioPreview.vue";
import CodePreview from "./preview/CodePreview.vue";
import EmptyPreview from "./preview/EmptyPreview.vue";
import ImagePreview from "./preview/ImagePreview.vue";
import MarkdownPreview from "./preview/MarkdownPreview.vue";
import TextPreview from "./preview/TextPreview.vue";
import VideoPreview from "./preview/VideoPreview.vue";
import { getPreviewTypeLabel, type PreviewKind } from "./preview/previewTypes";

const props = defineProps<{
  previewKind: PreviewKind;
  previewStatus: string;
  previewContent: string;
  previewSource: string;
  previewEncoding: string;
  previewLanguage: string;
}>();

const previewTypeLabel = computed(() => {
  if (
    props.previewKind === "text" ||
    props.previewKind === "markdown" ||
    props.previewKind === "code"
  ) {
    return props.previewEncoding || getPreviewTypeLabel(props.previewKind);
  }
  return getPreviewTypeLabel(props.previewKind);
});
</script>

<template>
  <aside class="preview-pane">
    <header class="preview-header">
      <span class="preview-type">{{ previewTypeLabel }}</span>
      <span>{{ previewStatus }}</span>
    </header>

    <TextPreview v-if="previewKind === 'text' && previewContent" :content="previewContent" />
    <MarkdownPreview
      v-else-if="previewKind === 'markdown' && previewContent"
      :content="previewContent"
    />
    <CodePreview
      v-else-if="previewKind === 'code' && previewContent"
      :content="previewContent"
      :language="previewLanguage"
    />
    <ImagePreview v-else-if="previewKind === 'image' && previewSource" :source="previewSource" />
    <VideoPreview v-else-if="previewKind === 'video' && previewSource" :source="previewSource" />
    <AudioPreview v-else-if="previewKind === 'audio' && previewSource" :source="previewSource" />
    <EmptyPreview v-else :status="previewStatus" />
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

.preview-type {
  min-width: 72px;
  white-space: nowrap;
  color: #9ba1a8;
  font-family: Consolas, "Cascadia Mono", monospace;
}

.preview-header span:last-child {
  margin-left: auto;
  color: #c3c8cf;
  white-space: nowrap;
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
}

@media (max-width: 560px) {
  .preview-pane {
    display: none;
  }
}
</style>
