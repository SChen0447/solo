<script setup lang="ts">
import type { KillEvent } from '../composables/useScoreboard'

defineProps<{
  events: KillEvent[]
}>()
</script>

<template>
  <div class="kill-feed">
    <div class="kill-feed-header">
      <span class="header-icon">⚔</span>
      <span class="header-title">击杀记录</span>
    </div>
    <div class="kill-feed-list">
      <TransitionGroup name="kill-item">
        <div
          v-for="event in events"
          :key="event.id"
          class="kill-item"
          :class="`team-${event.team}`"
        >
          <div class="killer">{{ event.killer }}</div>
          <div class="kill-info">
            <span class="weapon">{{ event.weapon }}</span>
            <span v-if="event.headshot" class="headshot">爆头</span>
          </div>
          <div class="victim">{{ event.victim }}</div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.kill-feed {
  width: 320px;
  height: 300px;
  background: rgba(31, 42, 68, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 255, 170, 0.15);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.kill-feed-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(0, 255, 170, 0.08);
  border-bottom: 1px solid rgba(0, 255, 170, 0.2);
}

.header-icon {
  color: #00ffaa;
  font-size: 16px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #00ffaa;
  letter-spacing: 1px;
}

.kill-feed-list {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.kill-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-size: 12px;
  border-left: 3px solid transparent;
}

.kill-item.team-blue {
  border-left-color: #00aaff;
}

.kill-item.team-red {
  border-left-color: #ff4466;
}

.killer {
  font-weight: 600;
  flex: 1;
}

.team-blue .killer {
  color: #66c2ff;
}

.team-red .killer {
  color: #ff7788;
}

.kill-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 10px;
}

.weapon {
  color: #8899bb;
  font-size: 11px;
  font-style: italic;
}

.headshot {
  padding: 2px 6px;
  background: #ffcc00;
  color: #1a1a2e;
  font-size: 10px;
  font-weight: 700;
  border-radius: 3px;
}

.victim {
  color: #90a0c0;
  text-align: right;
  flex: 1;
  opacity: 0.8;
}

.kill-item-enter-active {
  animation: kill-enter 0.4s ease-out;
}

.kill-item-leave-active {
  animation: kill-leave 0.4s ease-in forwards;
}

@keyframes kill-enter {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes kill-leave {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-30px);
  }
}
</style>
