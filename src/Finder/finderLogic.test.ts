import {
  DEFAULT_CATEGORIES,
  buildEverythingQuery,
  formatBytes,
  getNextSelectedPath,
  getNextVisibleCount,
  getRestoredSelectedPath,
  isAudioPreviewCandidate,
  isImagePreviewCandidate,
  isTextPreviewCandidate,
  isVideoPreviewCandidate,
  sortResults,
  type FinderCategory,
  type FinderResult,
} from "./finderLogic";
import {
  buildResultFilterQuery,
  filterResults,
  parseFilterExtensions,
  type ResultFilter,
} from "./useResultFilters";

declare const test: (name: string, fn: () => void) => void;
declare const assert: typeof import("node:assert/strict");

const sampleResults: FinderResult[] = [
  {
    name: "b.txt",
    path: "C:\\beta",
    fullPath: "C:\\beta\\b.txt",
    size: 10,
    modifiedAt: 200,
  },
  {
    name: "a.log",
    path: "C:\\alpha",
    fullPath: "C:\\alpha\\a.log",
    size: 30,
    modifiedAt: 100,
  },
  {
    name: "folder",
    path: "C:\\alpha",
    fullPath: "C:\\alpha\\folder",
    isDirectory: true,
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

test("sortResults supports name, path, size, and modified time ordering", () => {
  assert.deepEqual(
    sortResults(sampleResults, "name-asc").map((item) => item.name),
    ["a.log", "b.txt", "folder"],
  );
  assert.deepEqual(
    sortResults(sampleResults, "size-desc").map((item) => item.name),
    ["a.log", "b.txt", "folder"],
  );
  assert.deepEqual(
    sortResults(sampleResults, "modified-desc").map((item) => item.name),
    ["folder", "b.txt", "a.log"],
  );
  assert.deepEqual(
    sortResults(sampleResults, "path-desc").map((item) => item.name),
    ["b.txt", "folder", "a.log"],
  );
});

test("getNextVisibleCount grows by page size without exceeding total", () => {
  assert.equal(getNextVisibleCount(0, 100, 40), 40);
  assert.equal(getNextVisibleCount(40, 100, 40), 80);
  assert.equal(getNextVisibleCount(80, 100, 40), 100);
});

test("getNextSelectedPath moves selection with arrow keys", () => {
  const orderedPaths = sampleResults.map((item) => item.fullPath as string);

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
});

test("formatBytes returns compact human-readable values", () => {
  assert.equal(formatBytes(undefined), "");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5 MB");
});

test("parseFilterExtensions normalizes extension input", () => {
  assert.deepEqual(parseFilterExtensions(".log; tmp，TXT txt"), ["log", "tmp", "txt"]);
});

test("buildResultFilterQuery creates Everything exclusion terms", () => {
  const filters: ResultFilter[] = [
    { id: "1", directory: String.raw`C:\Temp`, extensions: ["log", "tmp"] },
    { id: "2", directory: String.raw`D:\Cache`, extensions: [] },
    { id: "3", directory: "", extensions: ["bak"] },
    { id: "4", directory: "", extensions: [] },
  ];

  assert.equal(
    buildResultFilterQuery(filters),
    String.raw`!<"C:\Temp\" ext:log;tmp> !<"D:\Cache\"> !<ext:bak> !*`,
  );
});

test("filterResults mirrors result filter matching semantics", () => {
  const filters: ResultFilter[] = [
    { id: "1", directory: String.raw`C:\alpha`, extensions: ["log"] },
  ];
  assert.deepEqual(
    filterResults(sampleResults, filters).map((item) => item.name),
    ["b.txt", "folder"],
  );
});
