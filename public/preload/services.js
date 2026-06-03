const fs = require("node:fs");
const path = require("node:path");

/**
 * @typedef {import("../../addon").AddonModule} AddonModule
 * @typedef {import("../../addon").EverythingAddon} EverythingAddon
 * @typedef {import("../../addon").EverythingQueryItem} EverythingQueryItem
 * @typedef {import("../../addon").EverythingQueryResult} EverythingQueryResult
 */

/** @returns {EverythingAddon | null} */
function loadEverythingAddon() {
  const manifestAddon = readAddonManifestFile();
  const candidates = [
    manifestAddon ? path.resolve(__dirname, "..", manifestAddon) : undefined,
    path.resolve(__dirname, "..", "addon.node"),
    path.resolve(__dirname, "..", "..", "addon", "index.node"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        /** @type {AddonModule} */
        const addon = require(candidate);
        return addon.everything;
      }
    } catch (error) {
      console.warn("[local-search-neo] Everything addon 加载失败:", candidate, error);
    }
  }

  return null;
}

const everythingAddon = loadEverythingAddon();

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
  readTextPreview(file, maxBytes = 20 * 1024) {
    const buffer = Buffer.alloc(maxBytes);
    const fd = fs.openSync(file, "r");

    try {
      const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, 0);
      return buffer.subarray(0, bytesRead).toString("utf-8");
    } finally {
      fs.closeSync(fd);
    }
  },
};
