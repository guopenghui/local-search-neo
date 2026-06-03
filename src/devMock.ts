import type { FinderCategory } from "./Finder/finderLogic";
import type { FinderResult, FinderSortMode } from "./Finder/finderLogic";

export function installDevMock() {
  if (typeof window === "undefined" || window.ztools) return;

  const storage = new Map<string, unknown>();
  const mockFiles = [
    makeFile("main.log", "C:\\Example\\Logs", 4_960_000, 1716428491904),
    makeFile("core-2026-06-02.log", "C:\\Example\\CrashDumps", 2_400_000, 1716428400000),
    makeFile("SEARCHFILTERHOST.EXE-44162447.pf", "C:\\Windows\\Prefetch", 43_200, 1716328400000),
    makeFile("session.json", "C:\\Example\\AppData\\Editor", 5_810, 1716228400000),
    makeFile("desktop-manager.log", "C:\\Example\\AppData\\Messenger", 24_120, 1716128400000),
    makeFile("system.log", "C:\\Example\\System", 124_200, 1716028400000),
    makeFile("system-data.dat", "C:\\Example\\System", 44_124_200, 1715928400000),
    makeFile("report.pdf", "D:\\Example\\Documents", 544_120, 1715828400000),
    makeFile("budget.xlsx", "D:\\Example\\Documents", 244_120, 1715728400000),
    makeFile("Pictures", "D:\\Example", 0, 1715628400000, true),
    ...Array.from({ length: 80 }, (_, index) =>
      makeFile(
        `debug-${String(index + 1).padStart(3, "0")}.log`,
        "C:\\Example\\Logs\\Archive",
        12_000 + index * 173,
        1715628400000 - index * 60_000,
      ),
    ),
  ];

  window.services = {
    everything: {
      isAvailable: () => true,
      isRunning: () => true,
      isDbLoaded: () => true,
      getVersion: () => ({ major: 1, minor: 4, revision: 1, build: 1026, text: "1.4.1.1026" }),
      query: (search: string, maxResults = 100, sortMode: FinderSortMode = "modified-desc") => {
        const keyword = search
          .replace(/ext:[^\s]+/g, "")
          .replace(/folder:/g, "")
          .trim()
          .toLowerCase();
        const wantsFolder = search.includes("folder:");
        const extMatch = /ext:([^\s]+)/.exec(search);
        const extensions = extMatch ? extMatch[1].split(";") : [];
        const items = mockFiles
          .filter((item) => !wantsFolder || item.isDirectory)
          .filter(
            (item) =>
              extensions.length === 0 ||
              extensions.some((ext) => item.name.toLowerCase().endsWith(`.${ext}`)),
          )
          .filter((item) => !keyword || `${item.name} ${item.path}`.toLowerCase().includes(keyword))
          .sort((left, right) => compareBySortMode(left, right, sortMode))
          .slice(0, maxResults);

        return { total: items.length, items };
      },
    },
    readTextPreview: () =>
      "[2026-05-23 15:01:31.904] [info] 启动本地搜索插件\\n[2026-05-23 15:01:33.101] [info] 收到输入事件\\n[2026-05-23 15:01:39.065] [info] 隐藏插件视图",
  };

  const ztoolsMock = {
    onPluginEnter(callback: any) {
      window.setTimeout(
        () => callback({ code: "finder", type: "dev", payload: { query: "log" }, option: {} }),
        0,
      );
    },
    onMainPush() {},
    onPluginOut() {},
    setExpendHeight() {
      return true;
    },
    setSubInput(callback: any) {
      window.setTimeout(() => callback({ text: "log" }), 0);
      return true;
    },
    removeSubInput() {
      return true;
    },
    setSubInputValue() {
      return true;
    },
    subInputFocus() {
      return true;
    },
    showMainWindow() {
      return true;
    },
    getFileIcon(filePath: string) {
      const isDirectory = mockFiles.some((item) => item.fullPath === filePath && item.isDirectory);
      const label = isDirectory
        ? "DIR"
        : (filePath.split(".").pop() || "FILE").slice(0, 4).toUpperCase();
      const color = isDirectory ? "#f59e0b" : "#2563eb";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${color}"/><text x="16" y="20" text-anchor="middle" font-family="Arial" font-size="8" fill="white">${label}</text></svg>`;

      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },
    shellOpenPath() {},
    shellShowItemInFolder() {},
    dbStorage: {
      getItem(key: string) {
        return storage.get(key);
      },
      setItem(key: string, value: unknown) {
        storage.set(key, value as FinderCategory[]);
      },
      removeItem(key: string) {
        storage.delete(key);
      },
    },
  };

  Object.defineProperty(window, "ztools", {
    configurable: true,
    value: ztoolsMock,
  });
}

function makeFile(
  name: string,
  dir: string,
  size: number,
  modifiedAt: number,
  isDirectory = false,
) {
  return {
    name,
    path: dir,
    fullPath: `${dir}\\${name}`,
    size,
    modifiedAt,
    isDirectory,
    exists: true,
  };
}

function compareBySortMode(left: FinderResult, right: FinderResult, mode: FinderSortMode) {
  const [field, direction] = mode.split("-") as [string, "asc" | "desc"];
  const directionFactor = direction === "asc" ? 1 : -1;
  const primary = compareField(left, right, field);
  if (primary !== 0) return primary * directionFactor;

  return (
    left.name.localeCompare(right.name, "zh-Hans-CN", { numeric: true, sensitivity: "base" }) *
    directionFactor
  );
}

function compareField(left: FinderResult, right: FinderResult, field: string) {
  if (field === "name")
    return left.name.localeCompare(right.name, "zh-Hans-CN", {
      numeric: true,
      sensitivity: "base",
    });
  if (field === "path")
    return (left.path ?? "").localeCompare(right.path ?? "", "zh-Hans-CN", {
      numeric: true,
      sensitivity: "base",
    });
  if (field === "size") return compareNumber(left.size ?? 0, right.size ?? 0);
  if (field === "modified") return compareNumber(left.modifiedAt ?? 0, right.modifiedAt ?? 0);
  return 0;
}

function compareNumber(left: number, right: number) {
  return left === right ? 0 : left > right ? 1 : -1;
}
