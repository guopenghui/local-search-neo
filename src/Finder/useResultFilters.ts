import { ref } from "vue";
import type { FinderResult } from "./finderLogic";

export interface ResultFilter {
  id: string;
  directory: string;
  extensions: string[];
}

export interface ResultFilterInput {
  directory?: string;
  extensions?: string;
}

const RESULT_FILTER_STORAGE_KEY = "local-search-neo:finder:result-filters";

export function useResultFilters(storageKey = RESULT_FILTER_STORAGE_KEY) {
  const resultFilters = ref<ResultFilter[]>([]);

  function loadResultFilters() {
    try {
      const stored = window.ztools.dbStorage.getItem<unknown>(storageKey);
      resultFilters.value = Array.isArray(stored)
        ? stored.map(normalizeStoredFilter).filter(isResultFilter)
        : [];
    } catch {
      resultFilters.value = [];
    }
  }

  function saveResultFilters() {
    window.ztools.dbStorage.setItem(storageKey, resultFilters.value);
  }

  function addResultFilter(input: ResultFilterInput) {
    const filter = createResultFilter(input);
    resultFilters.value = [...resultFilters.value, filter];
    saveResultFilters();
  }

  function removeResultFilter(id: string) {
    resultFilters.value = resultFilters.value.filter((filter) => filter.id !== id);
    saveResultFilters();
  }

  function buildQueryFilter() {
    return buildResultFilterQuery(resultFilters.value);
  }

  return {
    resultFilters,
    loadResultFilters,
    addResultFilter,
    removeResultFilter,
    buildQueryFilter,
  };
}

export function buildResultFilterQuery(filters: ResultFilter[]): string {
  return filters.map(buildResultFilterExclusion).filter(Boolean).join(" ");
}

export function filterResults(results: FinderResult[], filters: ResultFilter[]): FinderResult[] {
  if (filters.length === 0) return results;
  return results.filter((result) => !filters.some((filter) => matchesResultFilter(result, filter)));
}

export function matchesResultFilter(result: FinderResult, filter: ResultFilter): boolean {
  return matchesDirectory(result, filter.directory) && matchesExtension(result, filter.extensions);
}

export function parseFilterExtensions(value = ""): string[] {
  return [
    ...new Set(
      value
        .split(/[;,，\s]+/)
        .map((extension) => extension.trim().replace(/^\./, "").toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function formatFilterExtensions(extensions: string[]): string {
  return extensions.length > 0 ? extensions.join(";") : "*";
}

function buildResultFilterExclusion(filter: ResultFilter): string {
  const terms = [
    buildDirectoryQueryTerm(filter.directory),
    buildExtensionQueryTerm(filter.extensions),
  ].filter(Boolean);
  return terms.length > 0 ? `!<${terms.join(" ")}>` : "!*";
}

function buildDirectoryQueryTerm(directory: string): string {
  if (!directory) return "";
  return quoteEverythingTerm(ensureDirectorySearchPath(directory));
}

function buildExtensionQueryTerm(extensions: string[]): string {
  return extensions.length > 0 ? `ext:${extensions.join(";")}` : "";
}

function quoteEverythingTerm(value: string): string {
  return `"${value.replace(/"/g, "quot:")}"`;
}

function ensureDirectorySearchPath(directory: string): string {
  const normalized = normalizeDisplayDirectory(directory);
  return normalized.endsWith("\\") ? normalized : `${normalized}\\`;
}

function createResultFilter(input: ResultFilterInput): ResultFilter {
  return {
    id: `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    directory: normalizeDisplayDirectory(input.directory ?? ""),
    extensions: parseFilterExtensions(input.extensions),
  };
}

function normalizeStoredFilter(value: unknown): ResultFilter | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const id =
    typeof record.id === "string" && record.id
      ? record.id
      : `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const directory =
    typeof record.directory === "string" ? normalizeDisplayDirectory(record.directory) : "";
  const extensions = Array.isArray(record.extensions)
    ? [
        ...new Set(
          record.extensions
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().replace(/^\./, "").toLowerCase())
            .filter(Boolean),
        ),
      ]
    : parseFilterExtensions(typeof record.extensions === "string" ? record.extensions : "");

  return { id, directory, extensions };
}

function isResultFilter(value: ResultFilter | null): value is ResultFilter {
  return value !== null;
}

function matchesDirectory(result: FinderResult, directory: string): boolean {
  const filterDirectory = normalizePathForMatch(directory);
  if (!filterDirectory) return true;

  const candidates = [result.path, result.fullPath]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(normalizePathForMatch);

  return candidates.some(
    (candidate) => candidate === filterDirectory || candidate.startsWith(`${filterDirectory}\\`),
  );
}

function matchesExtension(result: FinderResult, extensions: string[]): boolean {
  if (extensions.length === 0) return true;
  return extensions.includes(getExtension(result.name || result.fullPath || ""));
}

function normalizeDisplayDirectory(directory: string): string {
  const normalized = directory.trim().replace(/\//g, "\\");
  if (!normalized) return "";
  if (/^[a-z]:\\?$/i.test(normalized)) return normalized.slice(0, 2) + "\\";
  return normalized.replace(/\\+$/, "");
}

function normalizePathForMatch(value: string): string {
  const normalized = value.trim().replace(/\//g, "\\").toLowerCase();
  if (/^[a-z]:\\?$/i.test(normalized)) return normalized.slice(0, 2);
  return normalized.replace(/\\+$/, "");
}

function getExtension(name: string): string {
  const fileName = name.split(/[\\/]/).pop() ?? name;
  const index = fileName.lastIndexOf(".");
  return index > 0 ? fileName.slice(index + 1).toLowerCase() : "";
}
