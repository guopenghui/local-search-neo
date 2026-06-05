import { watch, type Ref } from "vue";

interface UseFinderEnterActionOptions {
  enterAction: () => Record<string, unknown>;
  queryText: Ref<string>;
  selectedPath: Ref<string>;
  syncSubInputValue: () => void;
  search: () => void;
}

export function useFinderEnterAction({
  enterAction,
  queryText,
  selectedPath,
  syncSubInputValue,
  search,
}: UseFinderEnterActionOptions) {
  watch(enterAction, (action) => {
    const payload = getRecordValue(action, "payload");
    const option = getRecordValue(action, "option");
    const incomingQuery =
      getStringValue(payload, "query") ??
      getStringValue(payload, "text") ??
      getStringValue(option, "query") ??
      "";
    const incomingPath =
      getStringValue(payload, "selectedPath") ?? getStringValue(option, "fullPath");

    queryText.value = incomingQuery;
    syncSubInputValue();
    selectedPath.value = incomingPath ?? "";
    search();
  });
}

function getRecordValue(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getStringValue(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}
