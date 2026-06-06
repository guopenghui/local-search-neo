import type { ComputedRef, Ref } from "vue";
import { buildEverythingQuery, type FinderCategory } from "../core/finderLogic";

interface UseFinderQueryOptions {
  queryText: Ref<string>;
  activeCategory: ComputedRef<FinderCategory>;
}

export function useFinderQuery({ queryText, activeCategory }: UseFinderQueryOptions) {
  function buildFilteredEverythingQuery() {
    return buildEverythingQuery(queryText.value, activeCategory.value);
  }

  return {
    buildFilteredEverythingQuery,
  };
}
