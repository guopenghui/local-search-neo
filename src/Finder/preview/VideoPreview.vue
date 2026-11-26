<script setup lang="ts">
import { ref, shallowRef, watch } from "vue";
import { Play } from "@lucide/vue";
import { shouldAutoPlayMedia, type MediaAutoplayMode } from "../core/mediaAutoplay";
import { useMediaAutoplayGate } from "../composables/useMediaAutoplayGate";

const props = withDefaults(
  defineProps<{
    source: string;
    autoplayMode?: MediaAutoplayMode;
  }>(),
  {
    autoplayMode: "on-gesture",
  },
);

const gate = useMediaAutoplayGate();

const videoRef = shallowRef<HTMLVideoElement | null>(null);
const isPlaying = ref(false);

watch(
  () => props.source,
  () => {
    isPlaying.value = false;
  },
);

function handleLoadedMetadata() {
  if (!shouldAutoPlayMedia(props.autoplayMode, gate.unlocked.value)) return;
  void play();
}

async function play() {
  const video = videoRef.value;
  if (!video) return;
  try {
    await video.play();
  } catch {
    // 被拒绝自动播放时保持暂停，用户点击中间播放按钮即可
    isPlaying.value = false;
  }
}

function togglePlay() {
  const video = videoRef.value;
  if (!video) return;
  gate.unlock();
  if (video.paused) {
    void play();
  } else {
    video.pause();
  }
}

function handlePlay() {
  // 无论是自动播放还是用户按原生控件播放，都视为「已授权」，之后切换结果可以继续自动播放
  gate.unlock();
  isPlaying.value = true;
}

function handlePause() {
  isPlaying.value = false;
}
</script>

<template>
  <div class="preview-media-shell">
    <div class="preview-video-stage">
      <video
        ref="videoRef"
        :key="source"
        class="preview-video"
        :src="source"
        controls
        playsinline
        preload="metadata"
        @loadedmetadata="handleLoadedMetadata"
        @play="handlePlay"
        @pause="handlePause"
        @ended="handlePause"
      ></video>

      <button
        v-if="!isPlaying"
        type="button"
        class="preview-video-play"
        tabindex="-1"
        aria-label="播放"
        @click.stop="togglePlay"
      >
        <Play :size="28" :stroke-width="0" fill="currentColor" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.preview-media-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  padding: 0;
  overflow: hidden;
  background: #0f1012;
}

.preview-video-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.preview-video {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background: #000000;
}

.preview-video-play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgb(15 16 18 / 58%);
  color: #ffffff;
  box-shadow: 0 4px 18px rgb(0 0 0 / 38%);
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition:
    background-color 0.15s ease,
    transform 0.15s ease;
}

.preview-video-play:hover {
  background: rgb(15 16 18 / 76%);
  transform: translate(-50%, -50%) scale(1.06);
}

@media (prefers-color-scheme: light) {
  .preview-media-shell {
    background: #f8fafc;
  }
}
</style>
