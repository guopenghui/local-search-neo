/// <reference types="vite/client" />
/// <reference types="@ztools-center/ztools-api-types" />

import type {
  EverythingQueryItem,
  EverythingSortMode,
  EverythingVersion,
  TextFileInspection,
  TextPreviewResult,
} from "../addon";

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}

// Preload services 类型声明（对应 public/preload/services.js）
interface Services {
  everything: {
    isAvailable: () => boolean;
    isRunning: () => boolean;
    isDbLoaded: () => boolean;
    getVersion: () => EverythingVersion;
    query: (
      search: string,
      maxResults?: number,
      sortMode?: EverythingSortMode,
    ) => {
      total: number;
      items: Array<EverythingQueryItem & { fullPath: string; exists?: boolean }>;
    };
  };
  getFileUrl: (file: string) => string;
  isTextFile: (file: string) => boolean;
  inspectTextFile: (file: string, maxBytes?: number) => TextFileInspection;
  readTextPreview: (file: string, maxBytes?: number) => TextPreviewResult;
}

declare global {
  interface Window {
    services: Services;
  }
}

export {};
