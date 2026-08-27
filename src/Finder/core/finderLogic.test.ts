/// <reference types="node" />

import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_ORDER,
  buildEverythingQuery,
  filterResultsExcludingPaths,
  getDragTargetPaths,
  getNextSelectedPath,
  getNextVisibleCount,
  getRangeSelectedPaths,
  getRestoredSelectedPath,
  mergeResultsByMatchPathPriority,
  normalizeCategoryOrder,
  reorderArray,
  type FinderCategory,
  type FinderResult,
} from "./finderLogic";

declare const test: (name: string, fn: () => void) => void;
declare const assert: typeof import("node:assert/strict");

const sampleResults: FinderResult[] = [
  {
    name: "b.txt",
    path: "C:\\beta",
    fullPath: "C:\\beta\\b.txt",
    highlightedName: "b.txt",
    highlightedPath: "C:\\beta",
    extension: "txt",
    size: 10,
    modifiedAt: 200,
  },
  {
    name: "a.log",
    path: "C:\\alpha",
    fullPath: "C:\\alpha\\a.log",
    highlightedName: "a.log",
    highlightedPath: "C:\\alpha",
    extension: "log",
    size: 30,
    modifiedAt: 100,
  },
  {
    name: "folder",
    path: "C:\\alpha",
    fullPath: "C:\\alpha\\folder",
    highlightedName: "folder",
    highlightedPath: "C:\\alpha",
    extension: "",
    isDirectory: true,
    size: 0,
    modifiedAt: 300,
  },
];

test("default categories include built-in file type filters", () => {
  assert.deepEqual(
    DEFAULT_CATEGORIES.map((category) => category.label),
    ["全部", "文件夹", "EXCEL", "WORD", "PPT", "PDF", "图片", "视频", "音频", "压缩文件"],
  );
  assert.equal(DEFAULT_CATEGORIES.find((category) => category.id === "pdf")?.rule, "ext:pdf");
});

test("buildEverythingQuery combines keyword and category rule", () => {
  const pdfCategory = DEFAULT_CATEGORIES.find(
    (category) => category.id === "pdf",
  ) as FinderCategory;
  assert.equal(buildEverythingQuery(" report ", pdfCategory), "report ext:pdf");
  assert.equal(buildEverythingQuery("", pdfCategory), "ext:pdf");
  assert.equal(buildEverythingQuery("main.log", DEFAULT_CATEGORIES[0]), "main.log");
  assert.equal(buildEverythingQuery("", DEFAULT_CATEGORIES[0]), "");
});

test("buildEverythingQuery supports custom Everything rules and extension shorthand", () => {
  assert.equal(
    buildEverythingQuery("budget", {
      id: "custom",
      label: "表格",
      kind: "custom",
      rule: "ext:xlsx;csv",
    }),
    "budget ext:xlsx;csv",
  );
  assert.equal(
    buildEverythingQuery("icon", { id: "custom2", label: "图标", kind: "custom", rule: "png;ico" }),
    "icon ext:png;ico",
  );
});

test("buildEverythingQuery handles folder prefix and paths with spaces", () => {
  const pdfCategory = DEFAULT_CATEGORIES.find(
    (category) => category.id === "pdf",
  ) as FinderCategory;

  assert.equal(
    buildEverythingQuery("report", pdfCategory, "D:\\workspace"),
    "D:\\workspace report ext:pdf",
  );
  assert.equal(
    buildEverythingQuery("report", pdfCategory, "C:\\Program Files\\App"),
    '"C:\\Program Files\\App" report ext:pdf',
  );
  assert.equal(
    buildEverythingQuery("report", pdfCategory, '"C:\\Program Files\\App"'),
    '"C:\\Program Files\\App" report ext:pdf',
  );
  assert.equal(buildEverythingQuery("", DEFAULT_CATEGORIES[0], "D:\\workspace"), "D:\\workspace");
  assert.equal(
    buildEverythingQuery("", DEFAULT_CATEGORIES[0], "D:\\My Documents"),
    '"D:\\My Documents"',
  );
  assert.equal(buildEverythingQuery("test", DEFAULT_CATEGORIES[0], "   "), "test");
});

test("getNextVisibleCount grows by page size without exceeding total", () => {
  assert.equal(getNextVisibleCount(0, 100, 40), 40);
  assert.equal(getNextVisibleCount(40, 100, 40), 80);
  assert.equal(getNextVisibleCount(80, 100, 40), 100);
});

test("getNextSelectedPath moves selection with arrow keys", () => {
  const orderedPaths = sampleResults.map((item) => item.fullPath);

  assert.equal(getNextSelectedPath(orderedPaths, "", 1), "C:\\beta\\b.txt");
  assert.equal(getNextSelectedPath(orderedPaths, "C:\\beta\\b.txt", 1), "C:\\alpha\\a.log");
  assert.equal(getNextSelectedPath(orderedPaths, "C:\\alpha\\a.log", -1), "C:\\beta\\b.txt");
  assert.equal(getNextSelectedPath(orderedPaths, "C:\\alpha\\folder", 1), "C:\\alpha\\folder");
  assert.equal(getNextSelectedPath(orderedPaths, "C:\\beta\\b.txt", -1), "C:\\beta\\b.txt");
});

test("getRestoredSelectedPath keeps existing visible selection or picks sorted first item", () => {
  assert.equal(getRestoredSelectedPath(sampleResults, "C:\\alpha\\a.log"), "C:\\alpha\\a.log");
  assert.equal(getRestoredSelectedPath(sampleResults, ""), "C:\\beta\\b.txt");
  assert.equal(getRestoredSelectedPath(sampleResults, "D:\\missing.txt"), "C:\\beta\\b.txt");
  assert.equal(getRestoredSelectedPath([], "D:\\missing.txt"), "");
});

test("mergeResultsByMatchPathPriority keeps name matches first and removes duplicates", () => {
  const nameResults: FinderResult[] = [
    {
      name: "name-a.txt",
      path: "C:\\demo",
      fullPath: "C:\\demo\\name-a.txt",
      highlightedName: "name-a.txt",
      highlightedPath: "C:\\demo",
      extension: "txt",
      size: 100,
      modifiedAt: 1,
    },
    {
      name: "shared.txt",
      path: "C:\\demo",
      fullPath: "C:\\demo\\shared.txt",
      highlightedName: "shared.txt",
      highlightedPath: "C:\\demo",
      extension: "txt",
      size: 100,
      modifiedAt: 1,
    },
    {
      name: "name-b.txt",
      path: "D:\\demo",
      fullPath: "D:\\demo\\name-b.txt",
      highlightedName: "name-b.txt",
      highlightedPath: "D:\\demo",
      extension: "txt",
      size: 100,
      modifiedAt: 1,
    },
  ];
  const matchPathResults: FinderResult[] = [
    {
      name: "shared.txt",
      path: "C:\\demo",
      fullPath: "c:\\demo\\shared.txt",
      highlightedName: "shared.txt",
      highlightedPath: "C:\\demo",
      extension: "txt",
      size: 100,
      modifiedAt: 1,
    },
    {
      name: "path-a.txt",
      path: "C:\\demo",
      fullPath: "C:\\demo\\path-a.txt",
      highlightedName: "path-a.txt",
      highlightedPath: "C:\\demo",
      extension: "txt",
      size: 100,
      modifiedAt: 1,
    },
    {
      name: "path-b.txt",
      path: "D:\\demo",
      fullPath: "D:\\demo\\path-b.txt",
      highlightedName: "path-b.txt",
      highlightedPath: "D:\\demo",
      extension: "txt",
      size: 100,
      modifiedAt: 1,
    },
  ];

  assert.deepEqual(
    mergeResultsByMatchPathPriority(nameResults, matchPathResults).map((item) => item.fullPath),
    [
      "C:\\demo\\name-a.txt",
      "C:\\demo\\shared.txt",
      "D:\\demo\\name-b.txt",
      "C:\\demo\\path-a.txt",
      "D:\\demo\\path-b.txt",
    ],
  );
});

test("getRangeSelectedPaths calculates slice of items between anchor and target", () => {
  const visiblePaths = ["C:\\a.txt", "C:\\b.txt", "C:\\c.txt", "C:\\d.txt"];

  assert.deepEqual(getRangeSelectedPaths(visiblePaths, "C:\\a.txt", "C:\\c.txt"), [
    "C:\\a.txt",
    "C:\\b.txt",
    "C:\\c.txt",
  ]);
  assert.deepEqual(getRangeSelectedPaths(visiblePaths, "C:\\c.txt", "C:\\a.txt"), [
    "C:\\a.txt",
    "C:\\b.txt",
    "C:\\c.txt",
  ]);
  assert.deepEqual(getRangeSelectedPaths(visiblePaths, "C:\\missing.txt", "C:\\b.txt"), [
    "C:\\b.txt",
  ]);
  assert.deepEqual(getRangeSelectedPaths(visiblePaths, "C:\\a.txt", "C:\\missing.txt"), []);
  assert.deepEqual(getRangeSelectedPaths([], "C:\\a.txt", "C:\\b.txt"), []);
});

test("getDragTargetPaths resolves single vs multi-selection drag targets", () => {
  assert.equal(getDragTargetPaths("C:\\a.txt"), "C:\\a.txt");
  assert.equal(getDragTargetPaths("C:\\a.txt", ["C:\\a.txt"]), "C:\\a.txt");
  assert.deepEqual(getDragTargetPaths("C:\\a.txt", ["C:\\a.txt", "C:\\b.txt"]), [
    "C:\\a.txt",
    "C:\\b.txt",
  ]);
  assert.equal(getDragTargetPaths("C:\\c.txt", ["C:\\a.txt", "C:\\b.txt"]), "C:\\c.txt");
  assert.equal(getDragTargetPaths(""), "");
});

test("filterResultsExcludingPaths removes specified paths and preserves others", () => {
  const items = [
    { name: "1.txt", fullPath: "C:\\1.txt" },
    { name: "2.txt", fullPath: "C:\\2.txt" },
    { name: "3.txt", fullPath: "C:\\3.txt" },
  ];

  assert.deepEqual(filterResultsExcludingPaths(items, ["C:\\2.txt"]), [
    { name: "1.txt", fullPath: "C:\\1.txt" },
    { name: "3.txt", fullPath: "C:\\3.txt" },
  ]);
  assert.deepEqual(filterResultsExcludingPaths(items, ["C:\\missing.txt"]), items);
  assert.deepEqual(filterResultsExcludingPaths(items, []), items);
});

test("normalizeCategoryOrder retains valid IDs, deduplicates, and appends missing IDs", () => {
  const allIds = ["all", "folder", "excel", "custom-1", "custom-2"];
  // Valid partial stored order with deleted ID and duplicates
  const stored = ["custom-2", "folder", "custom-2", "deleted-id", "all"];
  const result = normalizeCategoryOrder(stored, allIds);

  assert.deepEqual(result, ["custom-2", "folder", "all", "excel", "custom-1"]);

  // Undefined stored order falls back to natural order
  assert.deepEqual(normalizeCategoryOrder(undefined, allIds), allIds);
  assert.deepEqual(normalizeCategoryOrder([], allIds), allIds);
  assert.deepEqual(
    normalizeCategoryOrder(DEFAULT_CATEGORY_ORDER, DEFAULT_CATEGORY_ORDER),
    DEFAULT_CATEGORY_ORDER,
  );
});

test("reorderArray moves items correctly within bounds and handles invalid indices", () => {
  const list = ["A", "B", "C", "D"];

  // Move forward: 0 -> 2
  assert.deepEqual(reorderArray(list, 0, 2), ["B", "C", "A", "D"]);
  // Move backward: 3 -> 1
  assert.deepEqual(reorderArray(list, 3, 1), ["A", "D", "B", "C"]);
  // Same index
  assert.deepEqual(reorderArray(list, 1, 1), ["A", "B", "C", "D"]);
  // Out of bounds
  assert.deepEqual(reorderArray(list, -1, 2), ["A", "B", "C", "D"]);
  assert.deepEqual(reorderArray(list, 1, 10), ["A", "B", "C", "D"]);
});
