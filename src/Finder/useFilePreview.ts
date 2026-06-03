import { ref, type ComputedRef, type Ref } from "vue";
import type { PreviewKind } from "./preview/previewTypes";
import {
  formatBytes,
  getCodePreviewLanguage,
  isAudioPreviewCandidate,
  isCodePreviewCandidate,
  isImagePreviewCandidate,
  isLogPreviewCandidate,
  isMarkdownPreviewCandidate,
  isPdfPreviewCandidate,
  isTextPreviewCandidate,
  isVideoPreviewCandidate,
  type FinderResult,
} from "./finderLogic";

const PREVIEW_BYTES = 20 * 1024;
const LOG_PREVIEW_BYTES = 10 * 1024;

interface UseFilePreviewOptions {
  selectedItem: ComputedRef<FinderResult | undefined>;
  previewEnabled: Ref<boolean>;
}

export function useFilePreview({ selectedItem, previewEnabled }: UseFilePreviewOptions) {
  const previewKind = ref<PreviewKind>("empty");
  const previewContent = ref("");
  const previewSource = ref("");
  const previewEncoding = ref("");
  const previewLanguage = ref("");
  const previewStatus = ref("未开启预览");

  function loadPreview() {
    resetPreview();

    if (!previewEnabled.value) {
      previewStatus.value = "未开启预览";
      return;
    }

    const item = selectedItem.value;
    if (!item) {
      previewStatus.value = "选择文件后预览";
      return;
    }

    if (item.isDirectory) {
      previewStatus.value = "文件夹不支持预览";
      return;
    }

    if (!item.fullPath) {
      previewStatus.value = "缺少文件路径，无法预览";
      return;
    }

    if (loadMediaPreview(item)) return;
    loadTextLikePreview(item);
  }

  function loadMediaPreview(item: FinderResult) {
    if (!item.fullPath) return false;

    if (isImagePreviewCandidate(item)) {
      previewKind.value = "image";
      previewSource.value = window.services.getFileUrl(item.fullPath);
      previewStatus.value = "图片预览";
      return true;
    }

    if (isVideoPreviewCandidate(item)) {
      previewKind.value = "video";
      previewSource.value = window.services.getFileUrl(item.fullPath);
      previewStatus.value = "视频预览";
      return true;
    }

    if (isAudioPreviewCandidate(item)) {
      previewKind.value = "audio";
      previewSource.value = window.services.getFileUrl(item.fullPath);
      previewStatus.value = "音频预览";
      return true;
    }

    if (isPdfPreviewCandidate(item)) {
      previewKind.value = "pdf";
      previewSource.value = item.fullPath;
      previewStatus.value = "PDF 预览";
      return true;
    }

    return false;
  }

  function loadTextLikePreview(item: FinderResult) {
    if (!item.fullPath) return;

    const textPreviewKind = getTextPreviewKind(item);
    let shouldPreviewAsText = textPreviewKind !== undefined;

    if (!shouldPreviewAsText) {
      try {
        shouldPreviewAsText = window.services.isTextFile(item.fullPath);
      } catch {
        shouldPreviewAsText = false;
      }
    }

    if (!shouldPreviewAsText) {
      previewStatus.value = "当前格式不支持预览";
      return;
    }

    const textPreviewBytes = isLogPreviewCandidate(item) ? LOG_PREVIEW_BYTES : PREVIEW_BYTES;
    const textPreviewDirection = isLogPreviewCandidate(item) ? "end" : "start";

    try {
      const preview = window.services.readTextPreview(
        item.fullPath,
        textPreviewBytes,
        textPreviewDirection,
      );
      if (!preview.isText) {
        previewStatus.value = "当前格式不支持预览";
        return;
      }

      previewKind.value = textPreviewKind ?? "text";
      previewContent.value = preview.text;
      previewEncoding.value = preview.encoding;
      previewLanguage.value = getCodePreviewLanguage(item) ?? "plaintext";
      previewStatus.value = getTextPreviewStatus(
        previewKind.value,
        item,
        textPreviewBytes,
        textPreviewDirection,
      );
    } catch (error: unknown) {
      resetPreview();
      previewStatus.value = error instanceof Error ? error.message : "预览失败";
    }
  }

  function resetPreview() {
    previewKind.value = "empty";
    previewContent.value = "";
    previewSource.value = "";
    previewEncoding.value = "";
    previewLanguage.value = "";
  }

  return {
    previewKind,
    previewContent,
    previewSource,
    previewEncoding,
    previewLanguage,
    previewStatus,
    loadPreview,
    resetPreview,
  };
}

function getTextPreviewKind(
  item: Pick<FinderResult, "name" | "size" | "isDirectory">,
): PreviewKind | undefined {
  if (isMarkdownPreviewCandidate(item)) return "markdown";
  if (isCodePreviewCandidate(item)) return "code";
  if (isTextPreviewCandidate(item)) return "text";
  return undefined;
}

function getTextPreviewStatus(
  kind: PreviewKind,
  item: Pick<FinderResult, "name" | "isDirectory">,
  bytes: number,
  direction: "start" | "end",
) {
  if (kind === "markdown") return "Markdown 预览";
  if (kind === "code") return `${getCodePreviewLanguage(item) ?? "plaintext"} · 代码预览`;
  return `预览${direction === "end" ? "后" : "前"} ${formatBytes(bytes)} 内容`;
}
