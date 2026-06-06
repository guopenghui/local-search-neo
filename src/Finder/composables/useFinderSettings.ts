import { ref } from "vue";

interface UseFinderSettingsOptions {
  focusSubInput: () => void;
}

export function useFinderSettings({ focusSubInput }: UseFinderSettingsOptions) {
  const showSettingsDrawer = ref(false);

  function openSettingsDrawer() {
    showSettingsDrawer.value = true;
  }

  function closeSettingsDrawer() {
    showSettingsDrawer.value = false;
    focusSubInput();
  }

  return {
    showSettingsDrawer,
    openSettingsDrawer,
    closeSettingsDrawer,
  };
}
