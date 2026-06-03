import { onUnmounted, type Ref } from "vue";

interface UseSubInputOptions {
  queryText: Ref<string>;
  onInput: () => void;
  placeholder?: string;
}

export function useSubInput({ queryText, onInput, placeholder = "全盘搜索" }: UseSubInputOptions) {
  let subInputReady = false;

  function bindSubInput() {
    if (subInputReady) return;

    window.ztools.setSubInput(
      ({ text }) => {
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
