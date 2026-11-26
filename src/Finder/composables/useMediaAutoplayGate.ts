import { ref } from "vue";

/**
 * 「本次插件会话内是否已经主动播放过一次媒体」的全局标记。
 *
 * 放在模块级而不是组件内，原因：音频 / 视频预览是同一套策略，用户在音频里点过一次播放后，
 * 切到视频也应当被视为「已授权」，不需要再点一次。ZTools 插件退出时由 Finder/index.vue
 * 调用 `resetMediaAutoplayUnlock()` 重置，保证下次打开插件仍然遵循「第一次要手动点」。
 */
const mediaAutoplayUnlocked = ref(false);

export function useMediaAutoplayGate() {
  return {
    unlocked: mediaAutoplayUnlocked,
    unlock: unlockMediaAutoplay,
  };
}

export function unlockMediaAutoplay() {
  mediaAutoplayUnlocked.value = true;
}

export function resetMediaAutoplayUnlock() {
  mediaAutoplayUnlocked.value = false;
}
