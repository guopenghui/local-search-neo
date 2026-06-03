/// <reference types="vite/client" />
/// <reference types="@ztools-center/ztools-api-types" />

import type { EverythingQueryItem, EverythingSortMode, EverythingVersion } from "../addon";

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
  readTextPreview: (file: string, maxBytes?: number) => string;
}

declare global {
  interface Window {
    services: Services;
  }
}

export {};
