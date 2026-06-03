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
  size?: number;
  modifiedAt?: number;
  attributes?: number;
  isDirectory?: boolean;
}

export interface EverythingQueryResult {
  total: number;
  items: EverythingQueryItem[];
}

export interface EverythingAddon {
  isRunning(): boolean;
  isDbLoaded(): boolean;
  getVersion(): EverythingVersion;
  query(search: string, maxResults?: number, sortMode?: EverythingSortMode): EverythingQueryResult;
}

export interface AddonModule {
  everything: EverythingAddon;
}

export const everything: EverythingAddon;
