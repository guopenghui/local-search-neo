<script setup lang="ts">
import { onMounted } from "vue";
import Finder from "./Finder/index.vue";
import {
  useFinderEnterAction,
  type FinderEnterAction,
} from "./Finder/composables/useFinderEnterAction";
import { warmUpFileIconCache } from "./Finder/core/fileIconCache";
import {
  DEFAULT_CATEGORIES,
  buildEverythingQuery,
  mergeResultsByMatchPathPriority,
} from "./Finder/core/finderLogic";
import { useFinderCategories } from "./Finder/composables/useFinderCategories";
import { usePersistStorage } from "./Finder/composables/usePersistStorage";
import { useSubInput } from "./Finder/composables/useSubInput";

const MAIN_PUSH_RESULT_LIMIT = 6;

type MainPushSearchResult = MainPushResult & {
  fullPath?: string;
};

const { loadPersistStorage, matchPathEnabled } = usePersistStorage();
const { resetActiveCategory } = useFinderCategories();
const { handleEnterAction } = useFinderEnterAction();
const { syncSubInputValue } = useSubInput();
loadPersistStorage();

async function buildEnterAction(action: PluginEnterAction): Promise<FinderEnterAction> {
  if (action.code === "oversearch") {
    return {
      query: action.payload as string,
    };
  } else if (action.code === "explorerfind") {
    const path = await window.ztools.readCurrentFolderPath();
    console.log("path", path)
    const name = path.split("\\").filter(Boolean).pop();
    return {
      prefix: path,
      placeholder: `在"${name}"中查找`,
    };
  } else if (action.code === "folderfind") {
    const { name, path } = (action.payload as MatchFile[])[0];
    return {
      prefix: path,
      placeholder: `在"${name}"中查找`,
    };
  } else {
    return {};
  }
}

onMounted(() => {
  warmUpFileIconCache();

  window.ztools.onPluginEnter<any, Partial<MainPushSearchResult> | undefined>(async (action) => {
    if (action.from === "main") {
      syncSubInputValue();
    } else {
      resetActiveCategory();
      handleEnterAction(await buildEnterAction(action as any));
    }

    window.ztools.subInputFocus();
  });

  window.ztools.onMainPush<string>(
    (action) => {
      if (action.code !== "oversearch") return [];

      const searchText = action.payload;
      const everythingQuery = buildEverythingQuery(searchText, DEFAULT_CATEGORIES[0]);

      try {
        if (!window.services.everything.isAvailable()) return [];
        if (window.services.everything.getStartupStatus().state !== "ready") return [];
        const nameResult = window.services.everything.query(
          everythingQuery,
          MAIN_PUSH_RESULT_LIMIT,
          "modified-desc",
          false,
        );
        const matchPathResult = matchPathEnabled.value
          ? window.services.everything.query(
              everythingQuery,
              MAIN_PUSH_RESULT_LIMIT,
              "modified-desc",
              true,
            )
          : undefined;

        const resultItems = matchPathResult
          ? mergeResultsByMatchPathPriority(nameResult.items, matchPathResult.items)
          : nameResult.items;
        const total = matchPathResult?.total ?? nameResult.total;

        const items: MainPushSearchResult[] = resultItems
          .slice(0, MAIN_PUSH_RESULT_LIMIT)
          .map((item) => ({
            title: item.path,
            text: item.name,
            icon: window.ztools.getFileIcon(item.fullPath),
            fullPath: item.fullPath,
          }));

        if (total > MAIN_PUSH_RESULT_LIMIT) {
          items.pop();
          items.push({
            text: `共有${total}个结果，查看更多...`,
          });
        }

        return items;
      } catch {
        return [];
      }
    },
    (action) => {
      resetActiveCategory();
      handleEnterAction({
        query: action.payload as string,
        fullPath: (action.option as MainPushSearchResult).fullPath,
      });
      return true;
    },
  );
});
</script>

<template>
  <Finder />
</template>
