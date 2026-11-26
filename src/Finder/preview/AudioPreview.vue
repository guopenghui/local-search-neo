<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { Pause, Play, Volume2, VolumeX } from "@lucide/vue";
import { shouldAutoPlayMedia, type MediaAutoplayMode } from "../core/mediaAutoplay";
import { loadAudioWaveform, type AudioWaveform } from "../core/audioWaveform";
import { useMediaAutoplayGate } from "../composables/useMediaAutoplayGate";

const props = withDefaults(
  defineProps<{
    source: string;
    /** 真实磁盘路径，用于读取音频字节生成波形；`source` 是 file:// URL，不能直接给 preload 读。 */
    filePath?: string;
    autoplayMode?: MediaAutoplayMode;
  }>(),
  {
    filePath: "",
    autoplayMode: "on-gesture",
  },
);

const gate = useMediaAutoplayGate();

const audioRef = shallowRef<HTMLAudioElement | null>(null);
const canvasRef = shallowRef<HTMLCanvasElement | null>(null);
const waveWrapRef = shallowRef<HTMLElement | null>(null);
const progressRef = shallowRef<HTMLElement | null>(null);

const waveform = shallowRef<AudioWaveform | null>(null);
const waveformState = ref<"loading" | "ready" | "unavailable">("loading");
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const hoverRatio = ref<number | null>(null);
const isScrubbing = ref(false);
const isProgressScrubbing = ref(false);
/** 预览面板很窄时（文件列表拉宽、窗口小），底栏要换用紧凑排版，否则控件会被挤出卡片。 */
const isCompact = ref(false);

const volume = ref(1);
let lastVolume = 1;

let loadToken = 0;
let decodeTimer = 0;
let frameHandle = 0;
let stateTimer = 0;
let resizeObserver: ResizeObserver | undefined;
let colorSchemeQuery: MediaQueryList | undefined;
let cachedColors: { played: string; rest: string; hover: string } | null = null;

const BAR_WIDTH = 2;
const BAR_GAP = 2;
/** 连按 ↑ ↓ 快速浏览时不必为每个文件都解码波形，停顿一小会儿再解析。 */
const WAVE_DECODE_DEBOUNCE_MS = 120;
/** 兜底同步间隔：即使 play/pause 事件丢失，UI 状态也会在 300ms 内跟上真实播放状态。 */
const STATE_SYNC_INTERVAL_MS = 300;

const progressPercent = computed(() => {
  if (!Number.isFinite(duration.value) || duration.value <= 0) return 0;
  return Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100));
});

const volumePercent = computed(() => Math.round(volume.value * 100));

const timeText = computed(
  () =>
    `${formatTime(currentTime.value, isCompact.value)} / ${formatTime(duration.value, isCompact.value)}`,
);

watch([() => props.source, () => props.filePath], () => void prepare(), { immediate: true });

onMounted(() => {
  stateTimer = window.setInterval(syncFromAudio, STATE_SYNC_INTERVAL_MS);
  applyVolume();
});

onBeforeUnmount(() => {
  if (decodeTimer) window.clearTimeout(decodeTimer);
  if (stateTimer) window.clearInterval(stateTimer);
  stopFrameLoop();
  resizeObserver?.disconnect();
  resizeObserver = undefined;
  colorSchemeQuery?.removeEventListener("change", handleColorSchemeChange);
  colorSchemeQuery = undefined;
  audioRef.value?.pause();
});

function handleColorSchemeChange() {
  cachedColors = null;
  drawWaveform();
}

async function prepare() {
  const token = ++loadToken;

  // 同 source、不同 filePath 时 <audio> 不会重建，必须先停掉旧的，避免串音
  audioRef.value?.pause();

  waveform.value = null;
  waveformState.value = "loading";
  isPlaying.value = false;
  currentTime.value = 0;
  duration.value = 0;
  cachedColors = null;
  drawWaveform();

  if (shouldAutoPlayMedia(props.autoplayMode, gate.unlocked.value)) {
    // 必须等 <audio> 元素以新的 source 渲染完成后再播放，否则会播到上一个文件
    await nextTick();
    if (token !== loadToken) return;
    void play();
  }

  if (decodeTimer) window.clearTimeout(decodeTimer);
  decodeTimer = window.setTimeout(() => {
    decodeTimer = 0;
    void decodeWaveform(props.filePath, token);
  }, WAVE_DECODE_DEBOUNCE_MS);
}

async function decodeWaveform(filePath: string, token: number) {
  const result = filePath ? await loadAudioWaveform(filePath) : null;
  if (token !== loadToken) return;

  if (result) {
    waveform.value = result;
    waveformState.value = "ready";
    if (Number.isFinite(result.duration) && result.duration > 0) {
      duration.value = result.duration;
    }
  } else {
    waveformState.value = "unavailable";
  }
  drawWaveform();
}

/** 以 <audio> 的真实状态为唯一事实来源，避免事件丢失导致按钮与实际播放状态不一致。 */
function syncFromAudio() {
  const audio = audioRef.value;
  if (!audio) return;

  const playing = !audio.paused && !audio.ended;
  if (playing !== isPlaying.value) {
    isPlaying.value = playing;
    if (playing) startFrameLoop();
    else {
      stopFrameLoop();
      drawWaveform();
    }
  }

  if (Number.isFinite(audio.currentTime)) currentTime.value = audio.currentTime;
  if (Number.isFinite(audio.duration) && audio.duration > 0) duration.value = audio.duration;
}

function togglePlay() {
  gate.unlock();
  const audio = audioRef.value;
  if (!audio) return;

  if (!audio.paused) {
    audio.pause();
    return;
  }
  void play();
}

async function play() {
  const audio = audioRef.value;
  if (!audio) return;

  try {
    await audio.play();
  } catch {
    // 浏览器/Electron 拒绝自动播放时保持暂停状态，由用户点击播放按钮继续
    isPlaying.value = false;
    stopFrameLoop();
    drawWaveform();
    return;
  }
  syncFromAudio();
}

function handleLoadedMetadata() {
  const audio = audioRef.value;
  if (!audio) return;
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    duration.value = audio.duration;
  }
  applyVolume();
  syncFromAudio();
  drawWaveform();
}

function handlePlay() {
  isPlaying.value = true;
  applyVolume();
  startFrameLoop();
}

function handlePause() {
  isPlaying.value = false;
  stopFrameLoop();
  drawWaveform();
}

function handleEnded() {
  isPlaying.value = false;
  stopFrameLoop();
  if (Number.isFinite(duration.value)) currentTime.value = duration.value;
  drawWaveform();
}

function handleTimeUpdate() {
  const audio = audioRef.value;
  if (!audio) return;
  currentTime.value = audio.currentTime;
  if (!isPlaying.value) drawWaveform();
}

function startFrameLoop() {
  stopFrameLoop();
  const tick = () => {
    const audio = audioRef.value;
    if (audio) {
      currentTime.value = audio.currentTime;
      if (audio.paused && isPlaying.value) {
        isPlaying.value = false;
        drawWaveform();
        return;
      }
    }
    drawWaveform();
    frameHandle = window.requestAnimationFrame(tick);
  };
  frameHandle = window.requestAnimationFrame(tick);
}

function stopFrameLoop() {
  if (frameHandle) {
    window.cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }
}

function ratioFromRect(element: HTMLElement | null, clientX: number) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
}

function seekTo(ratio: number) {
  const audio = audioRef.value;
  if (!audio) return;
  const total = Number.isFinite(audio.duration) ? audio.duration : duration.value;
  if (!Number.isFinite(total) || total <= 0) return;
  audio.currentTime = Math.min(total, Math.max(0, ratio * total));
  currentTime.value = audio.currentTime;
  drawWaveform();
}

function handleWavePointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  event.preventDefault();
  gate.unlock();

  isScrubbing.value = true;
  // 先响应用户的落点，再做指针捕获：捕获失败（指针已失效）不应连带丢掉这次跳转
  seekTo(ratioFromRect(waveWrapRef.value, event.clientX));
  (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);

  if (audioRef.value?.paused !== false) void play();
}

function handleWavePointerMove(event: PointerEvent) {
  hoverRatio.value = ratioFromRect(waveWrapRef.value, event.clientX);
  if (isScrubbing.value) seekTo(hoverRatio.value);
}

function handleWavePointerUp(event: PointerEvent) {
  if (!isScrubbing.value) return;
  isScrubbing.value = false;
  (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
}

function handleWavePointerLeave() {
  if (isScrubbing.value) return;
  hoverRatio.value = null;
  drawWaveform();
}

function handleProgressPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  event.preventDefault();
  gate.unlock();

  isProgressScrubbing.value = true;
  seekTo(ratioFromRect(progressRef.value, event.clientX));
  (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
}

function handleProgressPointerMove(event: PointerEvent) {
  if (!isProgressScrubbing.value) return;
  seekTo(ratioFromRect(progressRef.value, event.clientX));
}

function handleProgressPointerUp(event: PointerEvent) {
  if (!isProgressScrubbing.value) return;
  isProgressScrubbing.value = false;
  (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
}

function applyVolume() {
  const audio = audioRef.value;
  if (!audio) return;
  audio.volume = volume.value;
  audio.muted = volume.value === 0;
}

function handleVolumeInput(event: Event) {
  const next = Math.min(1, Math.max(0, Number((event.target as HTMLInputElement).value)));
  volume.value = next;
  if (next > 0) lastVolume = next;
  applyVolume();
}

function toggleMute() {
  volume.value = volume.value > 0 ? 0 : lastVolume || 1;
  applyVolume();
}

function drawWaveform() {
  const canvas = canvasRef.value;
  const wrap = waveWrapRef.value;
  if (!canvas || !wrap) return;

  const width = wrap.clientWidth;
  const height = wrap.clientHeight;
  if (width <= 0 || height <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const colors = (cachedColors ??= readWaveColors());

  const pitch = BAR_WIDTH + BAR_GAP;
  const barCount = Math.max(1, Math.floor((width + BAR_GAP) / pitch));
  const offsetX = Math.max(0, (width - (barCount * pitch - BAR_GAP)) / 2);
  const mid = height / 2;
  const maxBarHeight = Math.max(4, height - 10);

  const peaks = waveform.value?.peaks;
  const total = Number.isFinite(duration.value) ? duration.value : 0;
  const progress = total > 0 ? Math.min(1, currentTime.value / total) : 0;
  const playedBars = Math.round(barCount * progress);

  for (let index = 0; index < barCount; index += 1) {
    // 无波形数据时退化为等高轨道（仅表示进度，不伪造振幅）
    const amplitude = peaks ? samplePeak(peaks, index, barCount) : 0.3;
    const barHeight = Math.max(2, amplitude * maxBarHeight);
    const x = offsetX + index * pitch;
    const y = mid - barHeight / 2;

    if (index < playedBars) {
      ctx.fillStyle = colors.played;
    } else if (index === playedBars && progress > 0 && progress < 1) {
      ctx.fillStyle = colors.hover;
    } else {
      ctx.fillStyle = colors.rest;
    }
    ctx.fillRect(x, y, BAR_WIDTH, barHeight);
  }

  if (progress > 0 && progress < 1) {
    const playheadX = offsetX + progress * (barCount * pitch - BAR_GAP);
    ctx.fillStyle = colors.played;
    ctx.fillRect(playheadX - 0.5, 0, 1, height);
  }

  const hover = hoverRatio.value;
  if (hover !== null && !isScrubbing.value) {
    const hoverX = Math.min(width - 0.5, Math.max(0.5, hover * width));
    ctx.fillStyle = colors.hover;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(hoverX - 0.5, 0, 1, height);
    ctx.globalAlpha = 1;
  }
}

/** 读取当前主题下的波形配色（缓存，避免每帧调用 getComputedStyle）。 */
function readWaveColors() {
  const canvas = canvasRef.value;
  const fallback = { played: "#3b82f6", rest: "#4a5057", hover: "#8c939b" };
  if (!canvas) return fallback;

  const styles = getComputedStyle(canvas);
  return {
    played: styles.getPropertyValue("--wave-played-color").trim() || fallback.played,
    rest: styles.getPropertyValue("--wave-rest-color").trim() || fallback.rest,
    hover: styles.getPropertyValue("--wave-hover-color").trim() || fallback.hover,
  };
}

/** 从固定长度的峰值数组中，取出第 index / count 段的振幅。 */
function samplePeak(peaks: Float32Array, index: number, count: number): number {
  const start = Math.floor((index / count) * peaks.length);
  const end = Math.max(start + 1, Math.floor(((index + 1) / count) * peaks.length));
  let peak = 0;
  for (let cursor = start; cursor < end && cursor < peaks.length; cursor += 1) {
    const value = peaks[cursor];
    if (value > peak) peak = value;
  }
  return peak;
}

function formatTime(value: number, compact = false) {
  if (!Number.isFinite(value) || value < 0) return compact ? "0:00" : "00:00";
  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (part: number) => part.toString().padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return compact ? `${minutes}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

watch(waveWrapRef, (element) => {
  resizeObserver?.disconnect();
  colorSchemeQuery?.removeEventListener("change", handleColorSchemeChange);
  if (!element) return;

  resizeObserver = new ResizeObserver(() => {
    cachedColors = null;
    isCompact.value = element.clientWidth < 240;
    drawWaveform();
  });
  resizeObserver.observe(element);
  isCompact.value = element.clientWidth < 240;

  colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  colorSchemeQuery.addEventListener("change", handleColorSchemeChange);

  drawWaveform();
});
</script>

<template>
  <div class="preview-audio-shell">
    <div class="audio-player" :class="{ 'is-compact': isCompact }">
      <div
        ref="waveWrapRef"
        class="audio-wave"
        :class="{ 'is-loading': waveformState === 'loading' }"
        @pointerdown="handleWavePointerDown"
        @pointermove="handleWavePointerMove"
        @pointerup="handleWavePointerUp"
        @pointercancel="handleWavePointerUp"
        @pointerleave="handleWavePointerLeave"
      >
        <canvas ref="canvasRef" class="audio-wave-canvas" aria-hidden="true"></canvas>

        <span v-if="waveformState === 'loading'" class="audio-wave-badge">解析波形…</span>
        <span v-else-if="waveformState === 'unavailable'" class="audio-wave-badge">
          无法生成波形（文件过大或格式不支持）
        </span>

        <button
          type="button"
          class="audio-wave-toggle"
          :class="{ 'is-playing': isPlaying }"
          tabindex="-1"
          :aria-label="isPlaying ? '暂停' : '播放'"
          @pointerdown.stop
          @click.stop="togglePlay"
        >
          <Pause
            v-if="isPlaying"
            :size="26"
            :stroke-width="0"
            fill="currentColor"
            aria-hidden="true"
          />
          <Play v-else :size="26" :stroke-width="0" fill="currentColor" aria-hidden="true" />
        </button>
      </div>

      <div class="audio-bar">
        <button
          type="button"
          class="audio-bar-play"
          tabindex="-1"
          :aria-label="isPlaying ? '暂停' : '播放'"
          @click="togglePlay"
        >
          <Pause
            v-if="isPlaying"
            :size="16"
            :stroke-width="0"
            fill="currentColor"
            aria-hidden="true"
          />
          <Play v-else :size="16" :stroke-width="0" fill="currentColor" aria-hidden="true" />
        </button>

        <div
          ref="progressRef"
          class="audio-progress"
          :class="{ 'is-scrubbing': isProgressScrubbing }"
          role="slider"
          tabindex="-1"
          aria-label="播放进度"
          :aria-valuemin="0"
          :aria-valuemax="Math.round(duration)"
          :aria-valuenow="Math.round(currentTime)"
          @pointerdown="handleProgressPointerDown"
          @pointermove="handleProgressPointerMove"
          @pointerup="handleProgressPointerUp"
          @pointercancel="handleProgressPointerUp"
        >
          <span class="audio-progress-track"></span>
          <span class="audio-progress-fill" :style="{ width: `${progressPercent}%` }"></span>
          <span class="audio-progress-knob" :style="{ left: `${progressPercent}%` }"></span>
        </div>

        <span class="audio-time">{{ timeText }}</span>

        <div class="audio-volume">
          <button
            type="button"
            class="audio-icon-btn"
            tabindex="-1"
            :aria-label="volume > 0 ? '静音' : '取消静音'"
            @click="toggleMute"
          >
            <VolumeX v-if="volume === 0" :size="15" :stroke-width="2" aria-hidden="true" />
            <Volume2 v-else :size="15" :stroke-width="2" aria-hidden="true" />
          </button>
          <div class="audio-volume-pop">
            <input
              class="audio-volume-range"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="volume"
              :aria-label="`音量 ${volumePercent}%`"
              @input="handleVolumeInput"
            />
          </div>
        </div>
      </div>
    </div>

    <audio
      ref="audioRef"
      :key="source"
      class="audio-engine"
      :src="source"
      preload="metadata"
      aria-hidden="true"
      @loadedmetadata="handleLoadedMetadata"
      @timeupdate="handleTimeUpdate"
      @play="handlePlay"
      @pause="handlePause"
      @ended="handleEnded"
    ></audio>
  </div>
</template>

<style scoped>
.preview-audio-shell {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  padding: 24px;
  background: #0f1012;
  --wave-played-color: var(--primary-color, #3b82f6);
  --wave-rest-color: #474d55;
  --wave-hover-color: #9aa2ab;
}

.audio-player {
  display: grid;
  gap: 10px;
  width: min(100%, 640px);
  padding: 16px 16px 12px;
  box-sizing: border-box;
  background: #1a1c1f;
  border: 1px solid #2c2f33;
  border-radius: 12px;
}

.audio-wave {
  position: relative;
  height: 132px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  touch-action: none;
  background: linear-gradient(180deg, rgb(255 255 255 / 3%), rgb(255 255 255 / 0%));
}

.audio-wave-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.audio-wave-badge {
  position: absolute;
  top: 6px;
  left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgb(0 0 0 / 45%);
  color: #aeb4bb;
  font-size: 11px;
  pointer-events: none;
}

.audio-wave-toggle {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgb(15 16 18 / 62%);
  color: #ffffff;
  box-shadow: 0 2px 12px rgb(0 0 0 / 35%);
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition:
    background-color 0.15s ease,
    opacity 0.15s ease;
}

/* 播放中默认淡出，不遮挡波形；鼠标进入波形区域再浮现为「暂停」 */
.audio-wave-toggle.is-playing {
  opacity: 0;
  background: rgb(15 16 18 / 70%);
}

.audio-wave:hover .audio-wave-toggle.is-playing,
.audio-wave-toggle.is-playing:focus-visible {
  opacity: 1;
}

.audio-wave-toggle:hover {
  background: rgb(15 16 18 / 82%);
}

.audio-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #aeb4bb;
  font-size: 11px;
}

.audio-bar-play {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--primary-color, #3b82f6);
  color: #ffffff;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    filter 0.15s ease,
    transform 0.15s ease;
}

.audio-bar-play:hover {
  filter: brightness(1.1);
}

.audio-bar-play:active {
  transform: scale(0.94);
}

.audio-progress {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 24px;
  max-width: 260px;
  height: 16px;
  cursor: pointer;
  touch-action: none;
}

.audio-progress-track,
.audio-progress-fill {
  position: absolute;
  left: 0;
  height: 3px;
  border-radius: 2px;
  pointer-events: none;
}

.audio-progress-track {
  right: 0;
  background: #3a3f45;
}

.audio-progress-fill {
  background: var(--primary-color, #3b82f6);
}

.audio-progress-knob {
  position: absolute;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 45%);
  pointer-events: none;
  transition: transform 0.15s ease;
}

.audio-progress:hover .audio-progress-knob,
.audio-progress.is-scrubbing .audio-progress-knob {
  transform: scale(1.25);
}

.audio-time {
  color: #e6e9ec;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  flex-shrink: 0;
}

.audio-volume {
  position: relative;
  display: grid;
  place-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.audio-icon-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #aeb4bb;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.audio-icon-btn:hover {
  background: #2a2d31;
  color: #ffffff;
}

.audio-volume-pop {
  position: absolute;
  bottom: calc(100% + 6px);
  right: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #32373d;
  border: 1px solid #454b52;
  box-shadow: 0 8px 22px rgb(0 0 0 / 55%);
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
  z-index: 2;
}

.audio-volume:hover .audio-volume-pop,
.audio-volume:focus-within .audio-volume-pop {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.audio-volume-range {
  display: block;
  width: 84px;
  height: 16px;
  margin: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.audio-volume-range::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 2px;
  background: #4b5259;
}

.audio-volume-range::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 10px;
  margin-top: -3.5px;
  border-radius: 50%;
  background: var(--primary-color, #3b82f6);
  box-shadow: 0 1px 3px rgb(0 0 0 / 45%);
}

.audio-engine {
  display: none;
}

/* 预览面板被压窄时的紧凑排版：控件等比缩小，时间用 0:00 短格式，确保不溢出卡片 */
.audio-player.is-compact {
  gap: 8px;
  padding: 12px 12px 10px;
}

.audio-player.is-compact .audio-wave {
  height: 104px;
}

.audio-player.is-compact .audio-wave-toggle {
  width: 44px;
  height: 44px;
}

.audio-player.is-compact .audio-bar {
  gap: 5px;
}

.audio-player.is-compact .audio-bar-play {
  width: 26px;
  height: 26px;
}

.audio-player.is-compact .audio-progress {
  display: none;
}

.audio-player.is-compact .audio-icon-btn {
  width: 20px;
  height: 20px;
}

.audio-player.is-compact .audio-time {
  font-size: 10.5px;
}

@media (prefers-color-scheme: light) {
  .preview-audio-shell {
    background: #f8fafc;
    --wave-rest-color: #cbd5e1;
    --wave-hover-color: #64748b;
  }

  .audio-player {
    background: #ffffff;
    border-color: #dbe2ea;
  }

  .audio-wave {
    background: linear-gradient(180deg, rgb(15 23 42 / 3%), rgb(15 23 42 / 0%));
  }

  .audio-wave-badge {
    background: rgb(255 255 255 / 78%);
    color: #64748b;
  }

  .audio-wave-toggle {
    background: rgb(255 255 255 / 82%);
    color: #1f2937;
    box-shadow: 0 2px 10px rgb(15 23 42 / 18%);
  }

  .audio-wave-toggle.is-playing {
    background: rgb(255 255 255 / 90%);
  }

  .audio-wave-toggle:hover {
    background: rgb(255 255 255 / 96%);
  }

  .audio-bar {
    color: #667085;
  }

  .audio-progress-track {
    background: #e2e8f0;
  }

  .audio-progress-knob {
    background: var(--primary-color, #2563eb);
    box-shadow: 0 1px 3px rgb(15 23 42 / 28%);
  }

  .audio-time {
    color: #1f2937;
  }

  .audio-icon-btn {
    color: #667085;
  }

  .audio-icon-btn:hover {
    background: #eef2f7;
    color: #1f2937;
  }

  .audio-volume-pop {
    background: #ffffff;
    border-color: #e2e8f0;
    box-shadow: 0 6px 18px rgb(15 23 42 / 14%);
  }

  .audio-volume-range::-webkit-slider-runnable-track {
    background: #cbd5e1;
  }

  .audio-volume-range::-webkit-slider-thumb {
    background: var(--primary-color, #2563eb);
    box-shadow: 0 1px 3px rgb(15 23 42 / 25%);
  }
}
</style>
