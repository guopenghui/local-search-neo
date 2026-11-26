/**
 * 音频波形数据计算。
 *
 * 设计取舍：
 * 1. 波形需要真实振幅，只能把音频解码成 PCM。这里用一个共享的 `OfflineAudioContext`
 *    做解码，它的 sampleRate 故意设得很低（8kHz）——`decodeAudioData` 会按上下文采样率
 *    重采样，因此即使是一小时的录音，解码后的 PCM 内存也能控制在几十 MB 以内，而画波形
 *    只需要包络，损失采样率完全不影响显示。
 * 2. 超过 `MAX_WAVEFORM_BYTES` 的文件直接跳过：读入 + 解码超大文件会明显卡顿主线程，
 *    此时界面上退化为一条等高的波形轨道（progress bar），不影响播放本身。
 * 3. 同时只允许一定数量的文件缓存，避免切换搜索结果时内存无限增长。
 */

const MAX_WAVEFORM_BYTES = 24 * 1024 * 1024;
const WAVEFORM_BUCKETS = 900;
const WAVEFORM_CACHE_LIMIT = 16;
const DECODE_SAMPLE_RATE = 8000;
/** 每个 bucket 内最多扫描的采样点数上限，避免超长音频长时间占用主线程。 */
const MAX_SCAN_SAMPLES = 600_000;

export interface AudioWaveform {
  /** 归一化到 0~1 的振幅峰值，长度固定为 WAVEFORM_BUCKETS。 */
  peaks: Float32Array;
  /** 解码得到的时长（秒）。 */
  duration: number;
}

const waveformCache = new Map<string, AudioWaveform>();
const pendingTasks = new Map<string, Promise<AudioWaveform | null>>();
let decodeContext: OfflineAudioContext | null = null;

/**
 * 载入（并缓存）某个音频文件的波形数据。
 *
 * @returns 成功返回波形；解码失败或文件过大返回 `null`
 */
export async function loadAudioWaveform(filePath: string): Promise<AudioWaveform | null> {
  const cached = waveformCache.get(filePath);
  if (cached) {
    // 命中缓存时刷新 LRU 顺序
    waveformCache.delete(filePath);
    waveformCache.set(filePath, cached);
    return cached;
  }

  const inFlight = pendingTasks.get(filePath);
  if (inFlight) return inFlight;

  const task = buildAudioWaveform(filePath).finally(() => {
    pendingTasks.delete(filePath);
  });
  pendingTasks.set(filePath, task);
  return task;
}

async function buildAudioWaveform(filePath: string): Promise<AudioWaveform | null> {
  // 只接受真实文件系统路径：`<audio src>` 拿到的 file:// URL 不能直接交给 readBinaryFile
  if (!isFileSystemPath(filePath)) return null;

  const context = getDecodeContext();
  if (!context) return null;

  const fileSize = await readFileSize(filePath);
  if (fileSize !== undefined && fileSize > MAX_WAVEFORM_BYTES) return null;

  let bytes: Uint8Array;
  try {
    bytes = window.services.readBinaryFile(filePath);
  } catch {
    return null;
  }

  if (bytes.byteLength === 0 || bytes.byteLength > MAX_WAVEFORM_BYTES) return null;

  // readBinaryFile 在渲染进程里是 Node Buffer，其 buffer 可能是共享内存池，
  // 必须先按 byteOffset 拷出独立的 ArrayBuffer 再交给 decodeAudioData（该 API 会接管入参）。
  const audioData = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength).slice().buffer;

  try {
    const audioBuffer = await context.decodeAudioData(audioData);
    const waveform: AudioWaveform = {
      peaks: computePeaks(audioBuffer, WAVEFORM_BUCKETS),
      duration: audioBuffer.duration,
    };
    rememberWaveform(filePath, waveform);
    return waveform;
  } catch {
    return null;
  }
}

function isFileSystemPath(value: string): boolean {
  if (!value) return false;
  return !/^(?:file|blob|https?|data|chrome|about):/i.test(value);
}

async function readFileSize(filePath: string): Promise<number | undefined> {
  try {
    const info = await window.services.getFileInfo(filePath);
    return typeof info.size === "number" ? info.size : undefined;
  } catch {
    return undefined;
  }
}

function getDecodeContext(): OfflineAudioContext | null {
  if (decodeContext) return decodeContext;

  const OfflineContextCtor =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  if (!OfflineContextCtor) return null;

  try {
    decodeContext = new OfflineContextCtor(1, 1, DECODE_SAMPLE_RATE);
  } catch {
    decodeContext = null;
  }
  return decodeContext;
}

function computePeaks(audioBuffer: AudioBuffer, bucketCount: number): Float32Array {
  const peaks = new Float32Array(bucketCount);
  const length = audioBuffer.length;
  if (length <= 0) return peaks;

  const channels: Float32Array[] = [];
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    channels.push(audioBuffer.getChannelData(channel));
  }
  if (channels.length === 0) return peaks;

  const step = length / bucketCount;
  // 超长音频按步进抽样，保证总扫描量可控
  const stride = Math.max(1, Math.ceil(length / MAX_SCAN_SAMPLES));
  let maxPeak = 0;

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.floor(bucket * step);
    const end = Math.min(length, Math.max(start + 1, Math.floor((bucket + 1) * step)));
    let bucketPeak = 0;

    for (let index = start; index < end; index += stride) {
      for (let channel = 0; channel < channels.length; channel += 1) {
        const sample = Math.abs(channels[channel][index]);
        if (sample > bucketPeak) bucketPeak = sample;
      }
    }

    peaks[bucket] = bucketPeak;
    if (bucketPeak > maxPeak) maxPeak = bucketPeak;
  }

  if (maxPeak <= 0) return peaks;

  // 归一化 + 轻度压低动态范围，让安静段落的波形也看得清
  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    peaks[bucket] = Math.pow(peaks[bucket] / maxPeak, 0.72);
  }

  return peaks;
}

function rememberWaveform(filePath: string, waveform: AudioWaveform) {
  waveformCache.set(filePath, waveform);
  while (waveformCache.size > WAVEFORM_CACHE_LIMIT) {
    const oldestKey = waveformCache.keys().next().value;
    if (oldestKey === undefined) break;
    waveformCache.delete(oldestKey);
  }
}
