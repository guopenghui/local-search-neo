import { onUnmounted, type Ref } from "vue";

interface UseSubInputOptions {
  queryText: Ref<string>;
  onInput: () => void;
  placeholder?: string;
}

export function useSubInput({ queryText, onInput, placeholder = "全盘搜索" }: UseSubInputOptions) {
  let subInputReady = false;
  let programmaticInputValue: string | undefined;

  function bindSubInput() {
    if (subInputReady) return;

    window.ztools.setSubInput(
      ({ text }) => {
        if (programmaticInputValue === text) {
          programmaticInputValue = undefined;
          return;
        }

        programmaticInputValue = undefined;
        queryText.value = text;
        onInput();
      },
      placeholder,
      true,
    );
    subInputReady = true;
  }

  function syncSubInputValue() {
    if (!subInputReady) return;
    programmaticInputValue = queryText.value;
    window.ztools.setSubInputValue(queryText.value);
  }

  function focusSubInput() {
    window.ztools.subInputFocus();
  }

  function disposeSubInput() {
    window.ztools.removeSubInput();
    subInputReady = false;
  }

  onUnmounted(disposeSubInput);

  return {
    bindSubInput,
    syncSubInputValue,
    focusSubInput,
    disposeSubInput,
  };
}
