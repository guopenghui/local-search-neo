import type { ComputedRef, Ref } from "vue";
import { buildEverythingQuery, type FinderCategory } from "../core/finderLogic";

interface UseFinderQueryOptions {
  queryText: Ref<string>;
  activeCategory: ComputedRef<FinderCategory>;
  buildQueryFilter: () => string;
}

export function useFinderQuery({
  queryText,
  activeCategory,
  buildQueryFilter,
}: UseFinderQueryOptions) {
  function buildFilteredEverythingQuery() {
    return [buildEverythingQuery(queryText.value, activeCategory.value), buildQueryFilter()]
      .filter(Boolean)
      .join(" ");
  }

  return {
    buildFilteredEverythingQuery,
  };
}
