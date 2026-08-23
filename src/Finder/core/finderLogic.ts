export type CategoryKind = "all" | "folder" | "extension" | "custom";

export type SelectionMode = "single" | "toggle" | "range";

export interface FinderCategory {
  id: string;
  label: string;
  kind: CategoryKind;
  rule: string;
  enabled?: boolean;
}

export interface FinderResult {
  name: string;
  path: string;
  fullPath: string;
  highlightedName: string;
  highlightedPath: string;
  extension: string;
  size: number;
  modifiedAt: number;
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

export function buildEverythingQuery(keyword: string, category: FinderCategory): string {
  const trimmedKeyword = keyword.trim();
  const rule = normalizeCategoryRule(category.rule);

  return [trimmedKeyword, rule].filter(Boolean).join(" ");
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

  return results[0].fullPath;
}

export function getRangeSelectedPaths(
  visiblePaths: string[],
  anchorPath: string,
  targetPath: string,
): string[] {
  if (visiblePaths.length === 0 || !targetPath) return [];

  const targetIndex = visiblePaths.indexOf(targetPath);
  if (targetIndex === -1) return [];

  const anchorIndex = visiblePaths.indexOf(anchorPath);
  if (anchorIndex === -1) return [targetPath];

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return visiblePaths.slice(start, end + 1);
}

export function filterResultsExcludingPaths<T extends Pick<FinderResult, "fullPath">>(
  results: T[],
  pathsToRemove: string[],
): T[] {
  if (pathsToRemove.length === 0) return results;
  const toRemove = new Set(pathsToRemove);
  return results.filter((item) => !toRemove.has(item.fullPath));
}

export function getDragTargetPaths(
  itemPath: string,
  selectedPaths: string[] = [],
): string | string[] {
  if (!itemPath) return "";
  if (selectedPaths.length > 1 && selectedPaths.includes(itemPath)) {
    return [...selectedPaths];
  }
  return itemPath;
}

export function mergeResultsByMatchPathPriority<T extends Pick<FinderResult, "fullPath">>(
  nameResults: T[],
  matchPathResults: T[],
): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const item of [...nameResults, ...matchPathResults]) {
    const key = getResultDedupeKey(item);
    if (seen.has(key)) continue;

    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function getResultDedupeKey(item: Pick<FinderResult, "fullPath">): string {
  return item.fullPath.toLowerCase();
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
