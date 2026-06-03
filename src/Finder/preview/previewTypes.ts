export type PreviewKind = "empty" | "text" | "image" | "video" | "audio";

export function getPreviewTypeLabel(kind: PreviewKind): string {
  if (kind === "text") return "UTF-8";
  if (kind === "image") return "IMAGE";
  if (kind === "video") return "VIDEO";
  if (kind === "audio") return "AUDIO";
  return "";
}
