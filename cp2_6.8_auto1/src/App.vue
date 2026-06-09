<script setup lang="ts">
import { useScoreboard } from './composables/useScoreboard'
import ScoreBoard from './components/ScoreBoard.vue'
import KillFeed from './components/KillFeed.vue'
import MapView from './components/MapView.vue'
import PlayerPanel from './components/PlayerPanel.vue'
import StatusBar from './components/StatusBar.vue'

const { blueTeam, redTeam, killEvents, mapPositions, players, status, scoreFlash } = useScoreboard()
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <ScoreBoard
        :blue-team="blueTeam"
        :red-team="redTeam"
        :score-flash="scoreFlash"
      />
    </header>

    <main class="app-main">
      <aside class="left-panel">
        <MapView :positions="mapPositions" />
      </aside>

      <section class="center-panel">
        <div class="center-content">
          <div class="live-indicator">
            <span class="live-dot"></span>
            <span class="live-text">LIVE</span>
          </div>
          <h1 class="game-title">电竞精英联赛</h1>
          <p class="game-subtitle">季后赛 · 半决赛 BO5</p>
        </div>
      </section>

      <aside class="right-panel">
        <KillFeed :events="killEvents" />
      </aside>
    </main>

    <section class="player-section">
      <PlayerPanel :players="players" />
    </section>

    <footer class="app-footer">
      <StatusBar :status="status" />
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a0f1d;
  overflow: hidden;
}

.app-header {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(180deg, rgba(0, 255, 170, 0.03) 0%, transparent 100%);
  flex-shrink: 0;
}

.app-main {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 0 30px;
  min-height: 0;
}

.left-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20px;
}

.center-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.center-content {
  text-align: center;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(255, 68, 102, 0.15);
  border: 1px solid rgba(255, 68, 102, 0.3);
  border-radius: 20px;
  margin-bottom: 20px;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #ff4466;
  border-radius: 50%;
  animation: live-pulse 1.5s ease-in-out infinite;
}

@keyframes live-pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 5px #ff4466;
  }
  50% {
    opacity: 0.5;
    box-shadow: 0 0 15px #ff4466, 0 0 30px #ff4466;
  }
}

.live-text {
  font-size: 12px;
  font-weight: 700;
  color: #ff4466;
  letter-spacing: 2px;
}

.game-title {
  font-size: 42px;
  font-weight: 800;
  color: #e0e8f5;
  margin-bottom: 10px;
  letter-spacing: 4px;
  text-shadow: 0 0 30px rgba(0, 255, 170, 0.2);
}

.game-subtitle {
  font-size: 16px;
  color: #7080a0;
  letter-spacing: 2px;
}

.right-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20px;
}

.player-section {
  flex-shrink: 0;
}

.app-footer {
  flex-shrink: 0;
}

@media (min-width: 1440px) {
  .app-main {
    padding: 0 80px;
    gap: 40px;
  }

  .left-panel,
  .right-panel {
    width: 320px;
  }

  .game-title {
    font-size: 56px;
  }
}

@media (max-width: 1024px) {
  .app-main {
    flex-wrap: wrap;
    gap: 15px;
    padding: 0 15px;
  }

  .left-panel {
    order: 2;
    width: calc(50% - 8px);
  }

  .center-panel {
    order: 1;
    width: 100%;
    flex: none;
  }

  .right-panel {
    order: 3;
    width: calc(50% - 8px);
  }

  .game-title {
    font-size: 32px;
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 12px;
  }

  .app-main {
    flex-direction: column;
    flex-wrap: nowrap;
    padding: 10px;
    gap: 12px;
    overflow-y: auto;
  }

  .left-panel,
  .center-panel,
  .right-panel {
    order: unset;
    width: 100%;
    padding-top: 0;
  }

  .left-panel,
  .right-panel {
    justify-content: center;
  }

  .game-title {
    font-size: 24px;
  }

  .game-subtitle {
    font-size: 12px;
  }
}
</style>
