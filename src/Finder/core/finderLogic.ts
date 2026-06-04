export type CategoryKind = "all" | "folder" | "extension" | "custom";

export interface FinderCategory {
  id: string;
  label: string;
  kind: CategoryKind;
  rule: string;
}

export interface FinderResult {
  name: string;
  path?: string;
  fullPath?: string;
  size?: number;
  modifiedAt?: number;
  attributes?: number;
  isDirectory?: boolean;
}

export type FinderSortMode =
  | "name-asc"
  | "name-desc"
  | "path-asc"
  | "path-desc"
  | "size-asc"
  | "size-desc"
  | "modified-asc"
  | "modified-desc";

export const DEFAULT_CATEGORIES: FinderCategory[] = [
  { id: "all", label: "全部", kind: "all", rule: "" },
  { id: "folder", label: "文件夹", kind: "folder", rule: "folder:" },
  { id: "excel", label: "EXCEL", kind: "extension", rule: "ext:xls;xlsx;xlsm;csv" },
  { id: "word", label: "WORD", kind: "extension", rule: "ext:doc;docx;rtf" },
  { id: "ppt", label: "PPT", kind: "extension", rule: "ext:ppt;pptx" },
  { id: "pdf", label: "PDF", kind: "extension", rule: "ext:pdf" },
  { id: "image", label: "图片", kind: "extension", rule: "ext:jpg;jpeg;png;gif;webp;bmp;svg;ico" },
  { id: "video", label: "视频", kind: "extension", rule: "ext:mp4;mkv;avi;mov;wmv;flv;webm" },
  { id: "audio", label: "音频", kind: "extension", rule: "ext:mp3;wav;flac;aac;ogg;m4a" },
  { id: "archive", label: "压缩文件", kind: "extension", rule: "ext:zip;rar;7z;tar;gz;iso" },
];

const IMAGE_PREVIEW_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "ico",
]);

const VIDEO_PREVIEW_EXTENSIONS = new Set(["mp4", "webm", "ogv", "mov", "m4v", "mkv", "avi"]);

const AUDIO_PREVIEW_EXTENSIONS = new Set(["mp3", "wav", "flac", "aac", "ogg", "m4a", "opus"]);

const PDF_PREVIEW_EXTENSIONS = new Set(["pdf"]);

const MARKDOWN_PREVIEW_EXTENSIONS = new Set(["md", "markdown", "mdown"]);

const CODE_PREVIEW_LANGUAGE_BY_EXTENSION: Record<string, string> = {
  bat: "bat",
  c: "c",
  cmd: "bat",
  conf: "properties",
  cpp: "cpp",
  cs: "csharp",
  css: "css",
  go: "go",
  h: "c",
  html: "html",
  ini: "ini",
  java: "java",
  js: "javascript",
  json: "json",
  jsx: "jsx",
  ps1: "powershell",
  py: "python",
  rs: "rust",
  sh: "bash",
  sql: "sql",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  vue: "vue",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
};

const LOG_PREVIEW_EXTENSIONS = new Set(["log"]);

const TEXT_PREVIEW_EXTENSIONS = new Set([
  "bat",
  "c",
  "cmd",
  "conf",
  "cpp",
  "cs",
  "css",
  "csv",
  "go",
  "h",
  "html",
  "ini",
  "java",
  "js",
  "json",
  "jsx",
  "log",
  "md",
  "ps1",
  "py",
  "rs",
  "sh",
  "sql",
  "text",
  "toml",
  "ts",
  "tsx",
  "txt",
  "vue",
  "xml",
  "yaml",
  "yml",
]);

const MAX_TEXT_PREVIEW_FILE_SIZE = 20 * 1024 * 1024;

export function buildEverythingQuery(keyword: string, category: FinderCategory): string {
  const trimmedKeyword = keyword.trim();
  const rule = normalizeCategoryRule(category.rule);

  return [trimmedKeyword, rule].filter(Boolean).join(" ");
}

export function sortResults(results: FinderResult[], mode: FinderSortMode): FinderResult[] {
  const [field, direction] = mode.split("-") as [string, "asc" | "desc"];
  const directionFactor = direction === "asc" ? 1 : -1;

  return [...results].sort((left, right) => {
    const primary = compareByField(left, right, field);
    if (primary !== 0) return primary * directionFactor;

    return compareText(left.name, right.name) * directionFactor;
  });
}

export function getNextVisibleCount(current: number, total: number, pageSize: number): number {
  return Math.min(total, current + pageSize);
}

export function getNextSelectedPath(
  paths: string[],
  currentPath: string,
  direction: -1 | 1,
): string {
  if (paths.length === 0) return "";

  const currentIndex = paths.indexOf(currentPath);
  if (currentIndex === -1) return paths[0];

  const nextIndex = Math.max(0, Math.min(paths.length - 1, currentIndex + direction));
  return paths[nextIndex];
}

export function getRestoredSelectedPath(results: FinderResult[], currentPath: string): string {
  if (results.length === 0) return "";

  const exists = results.some((item) => item.fullPath === currentPath);
  if (exists) return currentPath;

  return results[0]?.fullPath ?? "";
}

export function isImagePreviewCandidate(file: Pick<FinderResult, "name" | "isDirectory">): boolean {
  if (file.isDirectory) return false;
  return IMAGE_PREVIEW_EXTENSIONS.has(getExtension(file.name));
}

export function isVideoPreviewCandidate(file: Pick<FinderResult, "name" | "isDirectory">): boolean {
  if (file.isDirectory) return false;
  return VIDEO_PREVIEW_EXTENSIONS.has(getExtension(file.name));
}

export function isAudioPreviewCandidate(file: Pick<FinderResult, "name" | "isDirectory">): boolean {
  if (file.isDirectory) return false;
  return AUDIO_PREVIEW_EXTENSIONS.has(getExtension(file.name));
}

export function isPdfPreviewCandidate(file: Pick<FinderResult, "name" | "isDirectory">): boolean {
  if (file.isDirectory) return false;
  return PDF_PREVIEW_EXTENSIONS.has(getExtension(file.name));
}

export function isMarkdownPreviewCandidate(
  file: Pick<FinderResult, "name" | "isDirectory">,
): boolean {
  if (file.isDirectory) return false;
  return MARKDOWN_PREVIEW_EXTENSIONS.has(getExtension(file.name));
}

export function getCodePreviewLanguage(
  file: Pick<FinderResult, "name" | "isDirectory">,
): string | undefined {
  if (file.isDirectory) return undefined;
  return CODE_PREVIEW_LANGUAGE_BY_EXTENSION[getExtension(file.name)];
}

export function isCodePreviewCandidate(file: Pick<FinderResult, "name" | "isDirectory">): boolean {
  return getCodePreviewLanguage(file) !== undefined;
}

export function isLogPreviewCandidate(file: Pick<FinderResult, "name" | "isDirectory">): boolean {
  if (file.isDirectory) return false;
  return LOG_PREVIEW_EXTENSIONS.has(getExtension(file.name));
}

export function isTextPreviewCandidate(
  file: Pick<FinderResult, "name" | "size" | "isDirectory">,
): boolean {
  if (file.isDirectory) return false;
  if ((file.size ?? 0) > MAX_TEXT_PREVIEW_FILE_SIZE) return false;

  return TEXT_PREVIEW_EXTENSIONS.has(getExtension(file.name));
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || Number.isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${formatNumber(value)} ${units[unitIndex]}`;
}

function normalizeCategoryRule(rule: string): string {
  const trimmed = rule.trim();
  if (!trimmed) return "";
  if (trimmed.includes(":") || trimmed.includes(" ") || trimmed.includes("*")) return trimmed;

  const extensions = trimmed
    .split(/[;,，\s]+/)
    .map((item) => item.trim().replace(/^\./, ""))
    .filter(Boolean);

  return extensions.length > 0 ? `ext:${extensions.join(";")}` : "";
}

function compareByField(left: FinderResult, right: FinderResult, field: string): number {
  if (field === "name") return compareText(left.name, right.name);
  if (field === "path") return compareText(left.path ?? "", right.path ?? "");
  if (field === "size") return compareNumber(left.size ?? 0, right.size ?? 0);
  if (field === "modified") return compareNumber(left.modifiedAt ?? 0, right.modifiedAt ?? 0);
  return 0;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "zh-Hans-CN", { numeric: true, sensitivity: "base" });
}

function compareNumber(left: number, right: number): number {
  return left === right ? 0 : left > right ? 1 : -1;
}

function getExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}
