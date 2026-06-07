import type { Ref } from "vue";
import type { RunSearchOptions } from "./useFinderSearch";

export interface FinderEnterAction {
  payload: string;
  option?: {
    fullPath?: string;
  };
}

interface UseFinderEnterActionOptions {
  queryText: Ref<string>;
  selectedPath: Ref<string>;
  syncSubInputValue: () => void;
  search: (options?: RunSearchOptions) => void;
}

export function useFinderEnterAction({
  queryText,
  selectedPath,
  syncSubInputValue,
  search,
}: UseFinderEnterActionOptions) {
  function handleEnterAction(action: FinderEnterAction) {
    const fullPath = action.option?.fullPath;

    queryText.value = action.payload;
    syncSubInputValue();
    selectedPath.value = fullPath ?? "";
    search({ preserveSelection: !!fullPath });
  }

  return {
    handleEnterAction,
  };
}
