export type PreviewKind =
  | "empty"
  | "text"
  | "markdown"
  | "code"
  | "tree"
  | "pdf"
  | "image"
  | "video"
  | "audio";

export function getPreviewTypeLabel(kind: PreviewKind): string {
  if (kind === "text") return "UTF-8";
  if (kind === "markdown") return "MD";
  if (kind === "code") return "CODE";
  if (kind === "tree") return "TREE";
  if (kind === "pdf") return "PDF";
  if (kind === "image") return "IMAGE";
  if (kind === "video") return "VIDEO";
  if (kind === "audio") return "AUDIO";
  return "";
}
