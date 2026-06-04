import type { FinderResult } from "./finderLogic";

interface IconCacheEntry {
  hash: string;
  url: string;
  dataUrl?: string;
}

const DIRECTORY_CACHE_KEY = "directory";
const PATH_CACHE_LIMIT = 300;

// 这些类型的图标通常取决于文件本身、快捷方式目标或可执行资源，不能只按后缀共享。
const PATH_DEPENDENT_EXTENSIONS = new Set([
  "ani",
  "appref-ms",
  "cpl",
  "cur",
  "exe",
  "ico",
  "lnk",
  "msc",
  "scr",
  "url",
]);

const sharedIconCache = new Map<string, IconCacheEntry>();
const pathIconCache = new Map<string, IconCacheEntry | null>();
const iconUrlByHash = new Map<string, string>();

export function getFileIconUrl(
  file: Pick<FinderResult, "name" | "fullPath" | "isDirectory">,
): string {
  return getFileIconEntry(file)?.url ?? "";
}

export function getFileIconDataUrl(
  file: Pick<FinderResult, "name" | "fullPath" | "isDirectory">,
): string {
  return getFileIconEntry(file)?.dataUrl ?? "";
}

function getFileIconEntry(
  file: Pick<FinderResult, "name" | "fullPath" | "isDirectory">,
): IconCacheEntry | null {
  const fullPath = file.fullPath;
  if (!fullPath) return null;

  const sharedCacheKey = getSharedCacheKey(file);
  if (sharedCacheKey) {
    const cached = sharedIconCache.get(sharedCacheKey);
    if (cached) return cached;
  } else {
    const cached = pathIconCache.get(fullPath);
    if (cached !== undefined) return cached;
  }

  const entry = readIcon(fullPath);

  if (sharedCacheKey) {
    if (entry) sharedIconCache.set(sharedCacheKey, entry);
    return entry;
  }

  rememberPathIcon(fullPath, entry);
  return entry;
}

export function clearFileIconCache() {
  for (const url of iconUrlByHash.values()) {
    URL.revokeObjectURL(url);
  }

  sharedIconCache.clear();
  pathIconCache.clear();
  iconUrlByHash.clear();
}

function getSharedCacheKey(file: Pick<FinderResult, "name" | "fullPath" | "isDirectory">): string {
  if (file.isDirectory) return DIRECTORY_CACHE_KEY;

  const extension = getExtension(file.name || file.fullPath || "");
  if (!extension || PATH_DEPENDENT_EXTENSIONS.has(extension)) return "";

  return `ext:${extension}`;
}

function readIcon(fullPath: string): IconCacheEntry | null {
  try {
    const icon = window.ztools.getFileIcon(fullPath);
    if (!icon) return null;

    const hash = hashIcon(icon);
    const dataUrl = icon.startsWith("data:") ? icon : undefined;
    const existedUrl = iconUrlByHash.get(hash);
    if (existedUrl) return { hash, url: existedUrl, dataUrl };

    const url = dataUrl ? dataUrlToObjectUrl(dataUrl) : icon;
    iconUrlByHash.set(hash, url);

    return { hash, url, dataUrl };
  } catch {
    return null;
  }
}

function rememberPathIcon(fullPath: string, entry: IconCacheEntry | null) {
  if (pathIconCache.has(fullPath)) {
    pathIconCache.delete(fullPath);
  }

  pathIconCache.set(fullPath, entry);

  if (pathIconCache.size <= PATH_CACHE_LIMIT) return;

  const oldestKey = pathIconCache.keys().next().value;
  if (oldestKey) pathIconCache.delete(oldestKey);
}

function dataUrlToObjectUrl(dataUrl: string): string {
  const match = /^data:([^,]*),(.*)$/s.exec(dataUrl);
  if (!match) return dataUrl;

  const metadata = match[1];
  const payload = match[2];
  const [mimeType = "application/octet-stream", ...parameters] = metadata.split(";");
  const isBase64 = parameters.some((parameter) => parameter.toLowerCase() === "base64");
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(new Blob([bytes], { type: mimeType || "application/octet-stream" }));
}

function hashIcon(icon: string): string {
  // FNV-1a 32-bit：足够用于本地进程内图标去重，前缀长度可以降低碰撞风险。
  let hash = 0x811c9dc5;

  for (let index = 0; index < icon.length; index += 1) {
    hash ^= icon.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `${icon.length}:${(hash >>> 0).toString(16)}`;
}

function getExtension(name: string): string {
  const fileName = name.split(/[\\/]/).pop() ?? name;
  const index = fileName.lastIndexOf(".");

  return index > 0 ? fileName.slice(index + 1).toLowerCase() : "";
}
