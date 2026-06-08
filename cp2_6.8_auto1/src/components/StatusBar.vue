<script setup lang="ts">
import type { StatusData } from '../composables/useScoreboard'

const props = defineProps<{
  status: StatusData
}>()

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="status-bar">
    <div class="status-item ping">
      <span class="status-icon">📶</span>
      <div class="status-content">
        <span class="status-label">PING</span>
        <span class="status-value ping-value" :class="{ 'ping-blink': status.ping < 40 }">
          {{ status.ping }}ms
        </span>
      </div>
    </div>

    <div class="status-item signal">
      <span class="status-icon">📡</span>
      <div class="status-content">
        <span class="status-label">信号</span>
        <div class="signal-bars">
          <span
            v-for="i in 5"
            :key="i"
            class="signal-bar"
            :class="{ active: i <= status.signalLevel }"
          ></span>
        </div>
      </div>
    </div>

    <div class="status-item timer">
      <span class="status-icon">⏱</span>
      <div class="status-content">
        <span class="status-label">比赛时间</span>
        <span class="status-value timer-value">{{ formatTime(status.matchTime) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: rgba(31, 42, 68, 0.8);
  border-top: 1px solid rgba(0, 255, 170, 0.2);
  min-height: 50px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-icon {
  font-size: 18px;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-label {
  font-size: 10px;
  color: #7080a0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.status-value {
  font-size: 16px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.ping-value {
  color: #00ff88;
}

.ping-value.ping-blink {
  animation: ping-blink 1.5s ease-in-out infinite;
}

@keyframes ping-blink {
  0%, 100% {
    text-shadow: 0 0 5px #00ff88;
    opacity: 1;
  }
  50% {
    text-shadow: 0 0 15px #00ff88, 0 0 30px #00ff88;
    opacity: 0.8;
  }
}

.signal-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 18px;
}

.signal-bar {
  width: 4px;
  background: #334466;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.signal-bar:nth-child(1) { height: 6px; }
.signal-bar:nth-child(2) { height: 10px; }
.signal-bar:nth-child(3) { height: 14px; }
.signal-bar:nth-child(4) { height: 18px; }
.signal-bar:nth-child(5) { height: 22px; }

.signal-bar.active {
  background: #ffcc00;
  box-shadow: 0 0 6px #ffcc00;
}

.timer-value {
  color: #ff4466;
  text-shadow: 0 0 10px rgba(255, 68, 102, 0.5);
}
</style>
