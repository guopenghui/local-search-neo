export type EverythingSortMode =
  | "name-asc"
  | "name-desc"
  | "path-asc"
  | "path-desc"
  | "size-asc"
  | "size-desc"
  | "modified-asc"
  | "modified-desc";

export interface EverythingVersion {
  major: number;
  minor: number;
  revision: number;
  build: number;
  text: string;
}

export interface EverythingQueryItem {
  name: string;
  path: string;
  fullPath: string;
  extension?: string;
  size?: number;
  modifiedAt?: number;
}

export interface EverythingQueryResult {
  total: number;
  items: EverythingQueryItem[];
}

export interface TextFileInspection {
  isText: boolean;
  encoding: string;
}

export type TextPreviewDirection = "start" | "end";

export interface TextPreviewResult extends TextFileInspection {
  text: string;
}

export interface FileTreeOptions {
  maxDepth?: number;
  maxItemsPerLevel?: number | number[];
}

export interface FileTreeResult {
  text: string;
  truncated: boolean;
}

export interface EverythingAddon {
  isRunning(): boolean;
  isDbLoaded(): boolean;
  getVersion(): EverythingVersion;
  query(search: string, maxResults?: number, sortMode?: EverythingSortMode): EverythingQueryResult;
}

export interface AddonModule {
  everything: EverythingAddon;
  inspectTextFile(file: string, maxBytes?: number): TextFileInspection;
  readTextPreview(
    file: string,
    maxBytes?: number,
    direction?: TextPreviewDirection,
  ): TextPreviewResult;
  printDirectoryTree(directory: string, options?: FileTreeOptions): FileTreeResult;
  printArchiveTree(file: string, options?: FileTreeOptions): FileTreeResult;
}

export const everything: EverythingAddon;
export function inspectTextFile(file: string, maxBytes?: number): TextFileInspection;
export function readTextPreview(
  file: string,
  maxBytes?: number,
  direction?: TextPreviewDirection,
): TextPreviewResult;
export function printDirectoryTree(directory: string, options?: FileTreeOptions): FileTreeResult;
export function printArchiveTree(file: string, options?: FileTreeOptions): FileTreeResult;
