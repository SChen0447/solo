<script setup lang="ts">
import type { Team } from '../composables/useScoreboard'

defineProps<{
  blueTeam: Team
  redTeam: Team
  scoreFlash: { blue: boolean; red: boolean }
}>()
</script>

<template>
  <div class="scoreboard">
    <div class="team team-blue">
      <div class="team-name">{{ blueTeam.name }}</div>
      <div class="team-score" :class="{ 'flash-blue': scoreFlash.blue }">
        {{ blueTeam.score }}
      </div>
      <div class="team-rounds">
        回合: <span class="round-num">{{ blueTeam.rounds }}</span>
      </div>
    </div>

    <div class="vs">
      <span class="vs-text">VS</span>
      <div class="vs-line"></div>
    </div>

    <div class="team team-red">
      <div class="team-rounds">
        回合: <span class="round-num">{{ redTeam.rounds }}</span>
      </div>
      <div class="team-score" :class="{ 'flash-red': scoreFlash.red }">
        {{ redTeam.score }}
      </div>
      <div class="team-name">{{ redTeam.name }}</div>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 20px 60px;
  background: linear-gradient(180deg, rgba(31, 42, 68, 0.9) 0%, rgba(10, 15, 29, 0.95) 100%);
  border: 1px solid rgba(0, 255, 170, 0.2);
  border-radius: 12px;
  box-shadow: 0 0 30px rgba(0, 255, 170, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.3);
}

.team {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

.team-blue {
  align-items: flex-end;
}

.team-red {
  align-items: flex-start;
}

.team-name {
  font-size: 18px;
  font-weight: 600;
  color: #a0b4d0;
  margin-bottom: 8px;
  letter-spacing: 2px;
}

.team-blue .team-name {
  color: #66c2ff;
}

.team-red .team-name {
  color: #ff7788;
}

.team-score {
  font-size: 48px;
  font-weight: 800;
  font-family: 'Courier New', monospace;
  color: #e0e8f5;
  line-height: 1;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.team-rounds {
  font-size: 13px;
  color: #7080a0;
  text-transform: uppercase;
}

.round-num {
  font-size: 18px;
  font-weight: 700;
  color: #00ffaa;
  font-family: 'Courier New', monospace;
}

.vs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.vs-text {
  font-size: 20px;
  font-weight: 800;
  color: #00ffaa;
  letter-spacing: 3px;
  text-shadow: 0 0 10px rgba(0, 255, 170, 0.5);
}

.vs-line {
  width: 2px;
  height: 40px;
  background: linear-gradient(180deg, transparent, #00ffaa, transparent);
}
</style>
