<script setup lang="ts">
import { onMounted, ref } from "vue";
import Finder from "./Finder/index.vue";
import { getFileIconDataUrl } from "./Finder/fileIconCache";
import { DEFAULT_CATEGORIES, buildEverythingQuery } from "./Finder/finderLogic";

const MAIN_PUSH_RESULT_LIMIT = 6;
const MAIN_PUSH_FILE_RESULT_LIMIT = MAIN_PUSH_RESULT_LIMIT - 1;

type MainPushSearchResult = MainPushResult & {
  fullPath?: string;
  query: string;
};

const enterAction = ref<Record<string, unknown>>({});

onMounted(() => {
  window.ztools.onPluginEnter((action) => {
    enterAction.value = action;
    window.ztools.subInputFocus();
  });
  window.ztools.onMainPush(
    (action) => {
      if (action.code !== "oversearch") return [];
      const query = extractMainPushText(action.payload);
      const everythingQuery = buildEverythingQuery(query, DEFAULT_CATEGORIES[0]);

      try {
        if (!window.services.everything.isAvailable()) return [];
        const result = window.services.everything.query(
          everythingQuery,
          MAIN_PUSH_FILE_RESULT_LIMIT,
          "modified-desc",
        );
        const items: MainPushSearchResult[] = result.items.map((item) => ({
          title: item.path ?? getParentPath(item.fullPath),
          text: item.name,
          icon: getFileIconDataUrl(item) || "logo.png",
          fullPath: item.fullPath,
          query,
        }));

        if (result.total > MAIN_PUSH_RESULT_LIMIT) {
          items.push({
            text: `共有${result.total}个结果，查看更多...`,
            query,
          });
        }

        return items;
      } catch (error) {
        return [];
      }
    },
    (action) => {
      enterAction.value = {
        ...action,
        code: "finder",
        payload: {
          query:
            readMainPushOptionString(action.option, "query") ?? extractMainPushText(action.payload),
          selectedPath: readMainPushOptionString(action.option, "fullPath"),
        },
      };
      window.ztools.subInputFocus();
      // window.ztools.showMainWindow()
      return true;
    },
  );
});

function extractMainPushText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";

  const record = payload as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (typeof record.keyword === "string") return record.keyword;
  return "";
}

function readMainPushOptionString(
  option: MainPushResult,
  key: "query" | "fullPath",
): string | undefined {
  const value = Reflect.get(option, key);
  return typeof value === "string" ? value : undefined;
}

function getParentPath(fullPath: string): string {
  const index = Math.max(fullPath.lastIndexOf("\\"), fullPath.lastIndexOf("/"));
  return index > 0 ? fullPath.slice(0, index) : fullPath;
}
</script>

<template>
  <Finder :enter-action="enterAction" />
</template>
