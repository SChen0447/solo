<template>
  <div class="playback-bar">
    <div class="playback-left">
      <button
        class="record-btn"
        :class="{ recording: isRecording }"
        @click="toggleRecording"
      >
        <span class="record-icon"></span>
        <span class="btn-label">{{ isRecording ? '停止' : '录制' }}</span>
      </button>
    </div>

    <div class="playback-center">
      <button class="play-btn" @click="$emit('rewind')" :disabled="duration === 0">
        ⏮
      </button>
      <button
        class="play-btn main-play"
        @click="togglePlay"
        :disabled="duration === 0"
      >
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <button class="play-btn" @click="$emit('forward')" :disabled="duration === 0">
        ⏭
      </button>

      <div class="progress-container">
        <div class="progress-bar" @click="handleProgressClick">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          <div
            class="progress-thumb"
            :style="{ left: progress + '%' }"
          ></div>
        </div>
        <div class="time-display">
          <span>{{ formatTime(currentTime) }}</span>
          <span>/</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
      </div>
    </div>

    <div class="playback-right">
      <div class="speed-control">
        <span class="speed-label">速度</span>
        <div class="speed-buttons">
          <button
            v-for="speed in speeds"
            :key="speed"
            class="speed-btn"
            :class="{ active: playbackSpeed === speed }"
            @click="$emit('speed-change', speed)"
          >
            {{ speed }}x
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isPlaying: boolean
  isRecording: boolean
  currentTime: number
  duration: number
  playbackSpeed: number
  progress: number
}>()

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'stop'): void
  (e: 'rewind'): void
  (e: 'forward'): void
  (e: 'record-start'): void
  (e: 'record-stop'): void
  (e: 'seek', time: number): void
  (e: 'speed-change', speed: number): void
}>()

const speeds = [0.5, 1, 2, 4]

const togglePlay = () => {
  if (props.isPlaying) {
    emit('pause')
  } else {
    emit('play')
  }
}

const toggleRecording = () => {
  if (props.isRecording) {
    emit('record-stop')
  } else {
    emit('record-start')
  }
}

const handleProgressClick = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percent = (x / rect.width) * 100
  emit('seek', (percent / 100) * props.duration)
}

const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const millis = Math.floor((ms % 1000) / 10)
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.playback-bar {
  height: 60px;
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(20px);
  border-top: 1px solid #33333a;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
  flex-shrink: 0;
}

.playback-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #252538;
  border: 1px solid #33333a;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease-out;
}

.record-btn:hover {
  border-color: #e94560;
}

.record-btn.recording {
  background: rgba(233, 69, 96, 0.2);
  border-color: #e94560;
  color: #e94560;
}

.record-icon {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e94560;
  transition: all 0.2s ease-out;
}

.record-btn.recording .record-icon {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

.playback-center {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.play-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #252538;
  border: 1px solid #33333a;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease-out;
  flex-shrink: 0;
}

.play-btn:hover:not(:disabled) {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.1);
}

.play-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.play-btn.main-play {
  width: 44px;
  height: 44px;
  background: #e94560;
  border-color: #e94560;
  font-size: 16px;
}

.play-btn.main-play:hover:not(:disabled) {
  background: #d63850;
  transform: scale(1.05);
}

.progress-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar {
  height: 6px;
  background: #33333a;
  border-radius: 3px;
  position: relative;
  cursor: pointer;
  transition: height 0.2s ease-out;
}

.progress-bar:hover {
  height: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e94560, #ff6b8a);
  border-radius: 3px;
  position: absolute;
  left: 0;
  top: 0;
}

.progress-thumb {
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s ease-out;
  pointer-events: none;
}

.progress-bar:hover .progress-thumb {
  opacity: 1;
}

.time-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #888;
  font-family: 'Monaco', 'Consolas', monospace;
}

.playback-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.speed-label {
  font-size: 12px;
  color: #888;
}

.speed-buttons {
  display: flex;
  gap: 2px;
  background: #252538;
  border-radius: 4px;
  padding: 2px;
}

.speed-btn {
  padding: 4px 10px;
  background: transparent;
  border: none;
  color: #888;
  font-size: 11px;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s ease-out;
}

.speed-btn:hover {
  color: #fff;
}

.speed-btn.active {
  background: #e94560;
  color: #fff;
}
</style>
