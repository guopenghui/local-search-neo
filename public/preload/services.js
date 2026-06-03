const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

/**
 * @typedef {import("../../addon").AddonModule} AddonModule
 * @typedef {import("../../addon").EverythingAddon} EverythingAddon
 * @typedef {import("../../addon").EverythingQueryItem} EverythingQueryItem
 * @typedef {import("../../addon").TextFileInspection} TextFileInspection
 * @typedef {import("../../addon").TextPreviewResult} TextPreviewResult
 */

/** @returns {AddonModule | null} */
function loadAddon() {
  const manifestAddon = readAddonManifestFile();
  const candidates = [
    manifestAddon ? path.resolve(__dirname, "..", manifestAddon) : undefined,
    path.resolve(__dirname, "..", "addon.node"),
    path.resolve(__dirname, "..", "..", "addon", "index.node"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return require(candidate);
      }
    } catch (error) {
      console.warn("[local-search-neo] Everything addon 加载失败:", candidate, error);
    }
  }

  return null;
}

const addon = loadAddon();
const everythingAddon = addon?.everything ?? null;

function readAddonManifestFile() {
  try {
    const manifestPath = path.resolve(__dirname, "..", "addon-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    return typeof manifest.addon === "string" ? manifest.addon : "";
  } catch {
    return "";
  }
}

/**
 * @param {string} file
 * @returns {{ fullPath: string, name: string, path: string, size: number, modifiedAt: number, isDirectory: boolean, exists: true }}
 */
function statFileInfo(file) {
  const stat = fs.statSync(file);
  return {
    fullPath: file,
    name: path.basename(file),
    path: path.dirname(file),
    size: stat.size,
    modifiedAt: stat.mtimeMs,
    isDirectory: stat.isDirectory(),
    exists: true,
  };
}

/**
 * @param {EverythingQueryItem} item
 * @returns {EverythingQueryItem & { fullPath: string, exists: boolean }}
 */
function enrichEverythingItem(item) {
  const fullPath = item.fullPath || path.join(item.path || "", item.name || "");
  try {
    return {
      ...item,
      ...statFileInfo(fullPath),
      fullPath,
    };
  } catch {
    return {
      ...item,
      fullPath,
      exists: false,
      isDirectory: item.isDirectory ?? false,
    };
  }
}

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  everything: {
    isAvailable() {
      return !!everythingAddon;
    },
    isRunning() {
      return everythingAddon?.isRunning() ?? false;
    },
    isDbLoaded() {
      return everythingAddon?.isDbLoaded() ?? false;
    },
    getVersion() {
      if (!everythingAddon) throw new Error("Everything addon is not available");
      return everythingAddon.getVersion();
    },
    query(search, maxResults = 100, sortMode = "modified-desc") {
      if (!everythingAddon) throw new Error("Everything addon is not available");
      const result = everythingAddon.query(search, maxResults, sortMode);
      return {
        total: result.total,
        items: result.items.map(enrichEverythingItem),
      };
    },
  },
  getFileUrl(file) {
    return pathToFileURL(file).href;
  },
  isTextFile(file) {
    if (!addon) throw new Error("Everything addon is not available");
    return addon.inspectTextFile(file).isText;
  },
  inspectTextFile(file, maxBytes) {
    if (!addon) throw new Error("Everything addon is not available");
    return addon.inspectTextFile(file, maxBytes);
  },
  readTextPreview(file, maxBytes = 20 * 1024, direction = "start") {
    if (!addon) throw new Error("Everything addon is not available");
    return addon.readTextPreview(file, maxBytes, direction);
  },
};
