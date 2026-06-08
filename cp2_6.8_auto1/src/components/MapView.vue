<script setup lang="ts">
import { computed } from 'vue'
import type { MapPosition } from '../composables/useScoreboard'

const props = defineProps<{
  positions: MapPosition[]
}>()

const gridSize = 6

const gridCells = computed(() => {
  const cells: { x: number; y: number; position: MapPosition | null }[] = []
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const position = props.positions.find((p) => p.x === x && p.y === y) || null
      cells.push({ x, y, position })
    }
  }
  return cells
})
</script>

<template>
  <div class="map-container">
    <div class="map-header">
      <span class="header-icon">🗺</span>
      <span class="header-title">战场地图</span>
    </div>
    <div class="map-grid">
      <div
        v-for="cell in gridCells"
        :key="`${cell.x}-${cell.y}`"
        class="grid-cell"
        :class="{
          'has-player': cell.position,
          'team-blue': cell.position?.team === 'blue',
          'team-red': cell.position?.team === 'red',
          'dead': cell.position && !cell.position.alive
        }"
      >
        <div v-if="cell.position" class="player-marker">
          <div class="marker-dot"></div>
        </div>
      </div>
    </div>
    <div class="map-legend">
      <div class="legend-item">
        <span class="legend-dot blue"></span>
        <span>蓝队</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot red"></span>
        <span>红队</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  width: 280px;
  background: rgba(31, 42, 68, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 255, 170, 0.15);
  border-radius: 10px;
  padding: 16px;
}

.map-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.header-icon {
  font-size: 16px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #00ffaa;
  letter-spacing: 1px;
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(6, 1fr);
  gap: 2px;
  aspect-ratio: 1;
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 4px;
}

.grid-cell {
  position: relative;
  background: rgba(31, 42, 68, 0.4);
  border: 1px solid rgba(100, 120, 160, 0.15);
  border-radius: 3px;
  transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.grid-cell.has-player.team-blue {
  background: rgba(0, 170, 255, 0.15);
  border-color: rgba(0, 170, 255, 0.4);
}

.grid-cell.has-player.team-red {
  background: rgba(255, 68, 102, 0.15);
  border-color: rgba(255, 68, 102, 0.4);
}

.grid-cell.has-player.dead {
  opacity: 0.3;
}

.player-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60%;
  height: 60%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse-glow 2s ease-in-out infinite;
}

.team-blue .marker-dot {
  background: #00aaff;
  box-shadow: 0 0 8px #00aaff, 0 0 16px #00aaff;
}

.team-red .marker-dot {
  background: #ff4466;
  box-shadow: 0 0 8px #ff4466, 0 0 16px #ff4466;
}

@keyframes pulse-glow {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

.map-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #90a0c0;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.blue {
  background: #00aaff;
  box-shadow: 0 0 6px #00aaff;
}

.legend-dot.red {
  background: #ff4466;
  box-shadow: 0 0 6px #ff4466;
}
</style>
