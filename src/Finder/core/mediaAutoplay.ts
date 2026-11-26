/**
 * 音视频自动播放策略。
 *
 * 需求背景：
 * 旧实现给 `<audio>` 直接加了 `autoplay`，导致搜索结果一出现（光标默认落在第一条），
 * 音频就会自己响起来，用户既没有点击也没有切换过选中项，体验非常打扰。
 *
 * 现在的策略把「播放」当成一次明确的用户意图：
 * - `click`：只有点击播放按钮 / 波形 / 视频画面才会播放，切换选中项一律不自动播放。
 * - `on-gesture`（默认）：本插件会话内，用户必须先主动播放过一次媒体；之后用 ↑ ↓ 或点击
 *   切换结果时才会自动播放，重新打开插件后再次需要一次点击。
 * - `always`：保持旧行为，选中即自动播放。
 */
export type MediaAutoplayMode = "click" | "on-gesture" | "always";

export const DEFAULT_MEDIA_AUTOPLAY_MODE: MediaAutoplayMode = "on-gesture";

export interface MediaAutoplayOption {
  value: MediaAutoplayMode;
  label: string;
  description: string;
}

export const MEDIA_AUTOPLAY_OPTIONS: MediaAutoplayOption[] = [
  {
    value: "on-gesture",
    label: "首次点击后自动播放",
    description: "先点一次播放，之后切换结果自动播放",
  },
  {
    value: "click",
    label: "仅点击播放",
    description: "每次都要手动点击才播放",
  },
  {
    value: "always",
    label: "始终自动播放",
    description: "选中即播放，不询问",
  },
];

export function isMediaAutoplayMode(value: unknown): value is MediaAutoplayMode {
  return value === "click" || value === "on-gesture" || value === "always";
}

export function normalizeMediaAutoplayMode(value: unknown): MediaAutoplayMode {
  return isMediaAutoplayMode(value) ? value : DEFAULT_MEDIA_AUTOPLAY_MODE;
}

/**
 * 判断「切换到该媒体时」是否应该自动开始播放。
 *
 * @param mode 用户在设置中选择的自动播放策略
 * @param unlocked 本次插件会话内是否已经发生过一次主动播放
 */
export function shouldAutoPlayMedia(mode: MediaAutoplayMode, unlocked: boolean): boolean {
  if (mode === "always") return true;
  if (mode === "on-gesture") return unlocked;
  return false;
}
