<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Player } from '../composables/useScoreboard'

const props = defineProps<{
  players: Player[]
}>()

const healthChanges = ref<Record<number, boolean>>({})
const prevHealth = ref<Record<number, number>>({})

watch(
  () => props.players,
  (newPlayers) => {
    newPlayers.forEach((p) => {
      if (prevHealth.value[p.id] !== undefined && prevHealth.value[p.id] !== p.health) {
        if (p.health < prevHealth.value[p.id]) {
          healthChanges.value[p.id] = true
          setTimeout(() => {
            healthChanges.value[p.id] = false
          }, 600)
        }
      }
      prevHealth.value[p.id] = p.health
    })
  },
  { deep: true }
)

function getHealthPercent(player: Player): number {
  return (player.health / player.maxHealth) * 100
}

function getHealthColor(player: Player): string {
  const percent = getHealthPercent(player)
  if (percent > 60) return '#00ff88'
  if (percent > 30) return '#ffcc00'
  return '#ff4466'
}

const heroEmojis: Record<string, string> = {
  '暗影刺客': '🗡',
  '烈焰战士': '🔥',
  '冰霜法师': '❄',
  '雷霆射手': '⚡',
  '神圣牧师': '✨',
  '幽灵忍者': '👤',
  '巨石守卫': '🛡',
  '风暴召唤师': '🌪'
}

function getHeroEmoji(hero: string): string {
  return heroEmojis[hero] || '🎮'
}
</script>

<template>
  <div class="player-panel">
    <div class="player-cards">
      <div
        v-for="player in players"
        :key="player.id"
        class="player-card"
        :class="{
          'team-blue': player.team === 'blue',
          'team-red': player.team === 'red',
          'dead': !player.alive,
          'health-damage': healthChanges[player.id]
        }"
      >
        <div class="avatar-ring">
          <div class="avatar-inner">
            <span class="hero-icon">{{ getHeroEmoji(player.hero) }}</span>
          </div>
          <div class="alive-glow" v-if="player.alive"></div>
        </div>
        <div class="player-info">
          <div class="player-name">{{ player.name }}</div>
          <div class="player-hero">{{ player.hero }}</div>
          <div class="health-bar-container">
            <div
              class="health-bar"
              :style="{
                width: `${getHealthPercent(player)}%`,
                backgroundColor: getHealthColor(player)
              }"
            ></div>
          </div>
          <div class="health-text">{{ player.health }} / {{ player.maxHealth }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-panel {
  width: 100%;
  padding: 20px;
  background: rgba(31, 42, 68, 0.4);
  border-top: 1px solid rgba(0, 255, 170, 0.15);
}

.player-cards {
  display: flex;
  justify-content: center;
  gap: 30px;
  flex-wrap: wrap;
}

.player-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.avatar-ring {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.team-blue .avatar-ring {
  background: linear-gradient(135deg, #00aaff, #0066cc);
  padding: 3px;
}

.team-red .avatar-ring {
  background: linear-gradient(135deg, #ff4466, #cc2244);
  padding: 3px;
}

.dead .avatar-ring {
  background: #444;
  filter: grayscale(0.8);
}

.avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #0a0f1d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
}

.hero-icon {
  display: block;
}

.alive-glow {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 8px;
  border-radius: 50%;
  background: #00ff88;
  box-shadow: 0 0 12px #00ff88, 0 0 24px #00ff88;
  animation: pulse-glow 2s ease-in-out infinite;
}

.dead .alive-glow {
  background: #ff4466;
  box-shadow: 0 0 12px #ff4466;
  animation: none;
  opacity: 0.5;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.6;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.2);
  }
}

.player-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.player-name {
  font-size: 13px;
  font-weight: 600;
  color: #e0e8f5;
}

.team-blue .player-name {
  color: #66c2ff;
}

.team-red .player-name {
  color: #ff7788;
}

.player-hero {
  font-size: 11px;
  color: #8899bb;
}

.health-bar-container {
  width: 90px;
  height: 6px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}

.health-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.health-damage .health-bar {
  animation: damage-pulse 0.6s ease-out;
}

@keyframes damage-pulse {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(2);
    box-shadow: 0 0 10px currentColor;
  }
}

.health-text {
  font-size: 10px;
  color: #7080a0;
  font-family: 'Courier New', monospace;
}

.dead .player-name,
.dead .player-hero,
.dead .health-text {
  opacity: 0.5;
}
</style>
