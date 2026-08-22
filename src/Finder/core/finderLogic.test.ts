/// <reference types="node" />

import {
  DEFAULT_CATEGORIES,
  buildEverythingQuery,
  filterResultsExcludingPaths,
  formatBytes,
  getArchiveTreePreviewBlockedReason,
  getCodePreviewLanguage,
  getDragTargetPaths,
  getNextSelectedPath,
  getNextVisibleCount,
  getRangeSelectedPaths,
  getRestoredSelectedPath,
  isArchiveTreePreviewCandidate,
  isAudioPreviewCandidate,
  isCodePreviewCandidate,
  isImagePreviewCandidate,
  isMarkdownPreviewCandidate,
  isPdfPreviewCandidate,
  isTextPreviewCandidate,
  isVideoPreviewCandidate,
  mergeResultsByMatchPathPriority,
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

test("preview candidate helpers detect supported file types", () => {
  assert.equal(isTextPreviewCandidate({ name: "main.log", size: 1024 }), true);
  assert.equal(isTextPreviewCandidate({ name: "notes.md", size: 1024 }), true);
  assert.equal(isTextPreviewCandidate({ name: "image.png", size: 1024 }), false);
  assert.equal(isTextPreviewCandidate({ name: "big.txt", size: 30 * 1024 * 1024 }), false);
  assert.equal(isTextPreviewCandidate({ name: "folder", isDirectory: true }), false);

  assert.equal(isImagePreviewCandidate({ name: "photo.webp" }), true);
  assert.equal(isImagePreviewCandidate({ name: "movie.mp4" }), false);
  assert.equal(isImagePreviewCandidate({ name: "Pictures", isDirectory: true }), false);

  assert.equal(isVideoPreviewCandidate({ name: "movie.mp4" }), true);
  assert.equal(isVideoPreviewCandidate({ name: "clip.webm" }), true);
  assert.equal(isVideoPreviewCandidate({ name: "sound.ogg" }), false);
  assert.equal(isVideoPreviewCandidate({ name: "photo.jpg" }), false);
  assert.equal(isVideoPreviewCandidate({ name: "Videos", isDirectory: true }), false);

  assert.equal(isAudioPreviewCandidate({ name: "sound.mp3" }), true);
  assert.equal(isAudioPreviewCandidate({ name: "voice.ogg" }), true);
  assert.equal(isAudioPreviewCandidate({ name: "track.flac" }), true);
  assert.equal(isAudioPreviewCandidate({ name: "movie.mp4" }), false);
  assert.equal(isAudioPreviewCandidate({ name: "Music", isDirectory: true }), false);

  assert.equal(isPdfPreviewCandidate({ name: "document.pdf" }), true);
  assert.equal(isPdfPreviewCandidate({ name: "PDFs", isDirectory: true }), false);

  assert.equal(isArchiveTreePreviewCandidate({ name: "archive.zip" }), true);
  assert.equal(isArchiveTreePreviewCandidate({ name: "source.tar" }), true);
  assert.equal(isArchiveTreePreviewCandidate({ name: "source.tar.gz" }), true);
  assert.equal(isArchiveTreePreviewCandidate({ name: "source.tgz" }), true);
  assert.equal(
    isArchiveTreePreviewCandidate({ name: "source.tar", size: 100 * 1024 * 1024 }),
    true,
  );
  assert.equal(
    isArchiveTreePreviewCandidate({ name: "source.tar", size: 100 * 1024 * 1024 + 1 }),
    false,
  );
  assert.equal(
    getArchiveTreePreviewBlockedReason({ name: "source.tar", size: 100 * 1024 * 1024 + 1 }),
    "压缩包超过 100 MB，不提供预览",
  );
  assert.equal(
    isArchiveTreePreviewCandidate({ name: "source.tar.gz", size: 100 * 1024 * 1024 + 1 }),
    false,
  );
  assert.equal(
    isArchiveTreePreviewCandidate({ name: "source.tgz", size: 100 * 1024 * 1024 + 1 }),
    false,
  );
  assert.equal(
    isArchiveTreePreviewCandidate({ name: "single-file.gz", size: 100 * 1024 * 1024 + 1 }),
    true,
  );
  assert.equal(
    getArchiveTreePreviewBlockedReason({
      name: "single-file.gz",
      size: 100 * 1024 * 1024 + 1,
    }),
    undefined,
  );
  assert.equal(isArchiveTreePreviewCandidate({ name: "archive.rar" }), false);
  assert.equal(isArchiveTreePreviewCandidate({ name: "Archives", isDirectory: true }), false);

  assert.equal(isMarkdownPreviewCandidate({ name: "README.md" }), true);
  assert.equal(isMarkdownPreviewCandidate({ name: "notes.markdown" }), true);
  assert.equal(isMarkdownPreviewCandidate({ name: "script.ts" }), false);

  assert.equal(isCodePreviewCandidate({ name: "script.ts" }), true);
  assert.equal(isCodePreviewCandidate({ name: "Component.vue" }), true);
  assert.equal(isCodePreviewCandidate({ name: "README.md" }), false);
  assert.equal(getCodePreviewLanguage({ name: "script.ts" }), "typescript");
});

test("formatBytes returns compact human-readable values", () => {
  assert.equal(formatBytes(undefined), "");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5 MB");
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
