<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { usePetStore, type Mood } from './stores/petStore'

const petStore = usePetStore()
const isPressed = ref<string | null>(null)

onMounted(() => {
  petStore.startDecayTimers()
})

onUnmounted(() => {
  petStore.cleanup()
})

const handleButtonPress = (action: string) => {
  isPressed.value = action
  setTimeout(() => {
    isPressed.value = null
  }, 300)
}

const feed = () => {
  handleButtonPress('feed')
  petStore.feed()
}

const bath = () => {
  handleButtonPress('bath')
  petStore.bath()
}

const play = () => {
  handleButtonPress('play')
  petStore.play()
}

const strokeDashoffset = (value: number, circumference: number) => {
  return circumference - (value / 100) * circumference
}

const healthCircumference = 2 * Math.PI * 120
const happinessCircumference = 2 * Math.PI * 105
const cleanlinessCircumference = 2 * Math.PI * 90

const healthOffset = computed(() => strokeDashoffset(petStore.health, healthCircumference))
const happinessOffset = computed(() => strokeDashoffset(petStore.happiness, happinessCircumference))
const cleanlinessOffset = computed(() => strokeDashoffset(petStore.cleanliness, cleanlinessCircumference))

const moodEmoji = computed(() => {
  const moods: Record<Mood, string> = {
    happy: '😊',
    normal: '😐',
    sad: '😢'
  }
  return moods[petStore.mood]
})

const eyeWidth = computed(() => {
  const avg = (petStore.health + petStore.happiness + petStore.cleanliness) / 3
  if (avg >= 70) return 12
  if (avg >= 40) return 8
  return 4
})

const mouthCurve = computed(() => {
  const avg = (petStore.health + petStore.happiness + petStore.cleanliness) / 3
  if (avg >= 70) return 'Q 40 48 55 42'
  if (avg >= 40) return 'Q 40 45 55 45'
  return 'Q 40 52 55 48'
})
</script>

<template>
  <div class="pet-card">
    <h1 class="title">🐾 桌面宠物</h1>

    <div class="pet-container">
      <div class="mood-indicator" :class="petStore.mood">
        <span class="mood-emoji">{{ moodEmoji }}</span>
      </div>

      <div class="rings-container">
        <svg class="progress-ring health-ring" viewBox="0 0 260 260">
          <circle class="ring-bg" cx="130" cy="130" :r="120" />
          <circle
            class="ring-progress health-progress"
            cx="130" cy="130" :r="120"
            :stroke-dasharray="healthCircumference"
            :stroke-dashoffset="healthOffset"
          />
        </svg>

        <svg class="progress-ring happiness-ring" viewBox="0 0 230 230">
          <circle class="ring-bg" cx="115" cy="115" :r="105" />
          <circle
            class="ring-progress happiness-progress"
            cx="115" cy="115" :r="105"
            :stroke-dasharray="happinessCircumference"
            :stroke-dashoffset="happinessOffset"
          />
        </svg>

        <svg class="progress-ring cleanliness-ring" viewBox="0 0 200 200">
          <circle class="ring-bg" cx="100" cy="100" :r="90" />
          <circle
            class="ring-progress cleanliness-progress"
            cx="100" cy="100" :r="90"
            :stroke-dasharray="cleanlinessCircumference"
            :stroke-dashoffset="cleanlinessOffset"
          />
        </svg>

        <div class="pet-avatar" :class="[petStore.currentAnimation, petStore.mood]">
          <svg viewBox="0 0 100 100" class="pet-svg">
            <ellipse cx="50" cy="55" rx="35" ry="32" fill="#FFE4B5" />
            <ellipse cx="25" cy="30" rx="10" ry="14" fill="#DEB887" />
            <ellipse cx="75" cy="30" rx="10" ry="14" fill="#DEB887" />
            <ellipse cx="35" cy="45" :rx="eyeWidth" ry="10" fill="#333" />
            <ellipse cx="65" cy="45" :rx="eyeWidth" ry="10" fill="#333" />
            <circle cx="32" cy="42" r="3" fill="#fff" />
            <circle cx="62" cy="42" r="3" fill="#fff" />
            <ellipse cx="50" cy="55" rx="5" ry="4" fill="#FFB6C1" />
            <path d="M 45 62 {{ mouthCurve }}" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round" />
            <ellipse cx="25" cy="55" rx="6" ry="4" fill="#FFB6C1" opacity="0.6" />
            <ellipse cx="75" cy="55" rx="6" ry="4" fill="#FFB6C1" opacity="0.6" />
          </svg>
        </div>
      </div>

      <h2 class="pet-name">{{ petStore.name }}</h2>
    </div>

    <div class="stats-panel">
      <div class="stat-item">
        <span class="stat-label">❤️ 健康</span>
        <div class="progress-bar-container">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill health-bar" :style="{ width: petStore.health + '%' }"></div>
          </div>
          <span class="stat-value">{{ petStore.health }}%</span>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-label">🎮 快乐</span>
        <div class="progress-bar-container">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill happiness-bar" :style="{ width: petStore.happiness + '%' }"></div>
          </div>
          <span class="stat-value">{{ petStore.happiness }}%</span>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-label">✨ 清洁</span>
        <div class="progress-bar-container">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill cleanliness-bar" :style="{ width: petStore.cleanliness + '%' }"></div>
          </div>
          <span class="stat-value">{{ petStore.cleanliness }}%</span>
        </div>
      </div>
    </div>

    <div class="action-buttons">
      <button class="action-btn feed-btn" :class="{ pressed: isPressed === 'feed' }" @click="feed">
        <span class="btn-icon">🍖</span>
        <span class="btn-text">喂养</span>
      </button>
      <button class="action-btn bath-btn" :class="{ pressed: isPressed === 'bath' }" @click="bath">
        <span class="btn-icon">🛁</span>
        <span class="btn-text">洗澡</span>
      </button>
      <button class="action-btn play-btn" :class="{ pressed: isPressed === 'play' }" @click="play">
        <span class="btn-icon">🎾</span>
        <span class="btn-text">玩耍</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pet-card {
  background: #fffdf8;
  border-radius: 32px;
  padding: 32px 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.title {
  text-align: center;
  color: #5a4a42;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.pet-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mood-indicator {
  position: absolute;
  top: -10px;
  z-index: 10;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mood-emoji {
  font-size: 24px;
}

.mood-indicator.happy {
  animation: breathe-fast 1s ease-in-out infinite;
}

.mood-indicator.normal {
  animation: breathe-normal 2s ease-in-out infinite;
}

.mood-indicator.sad {
  animation: breathe-slow 3s ease-in-out infinite;
}

@keyframes breathe-fast {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.85; }
}

@keyframes breathe-normal {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.9; }
}

@keyframes breathe-slow {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.95); opacity: 0.6; }
}

.rings-container {
  position: relative;
  width: 260px;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
}

.progress-ring {
  position: absolute;
  transform: rotate(-90deg);
}

.health-ring {
  width: 260px;
  height: 260px;
  animation: ring-enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}

.happiness-ring {
  width: 230px;
  height: 230px;
  animation: ring-enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both;
}

.cleanliness-ring {
  width: 200px;
  height: 200px;
  animation: ring-enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both;
}

@keyframes ring-enter {
  from {
    opacity: 0;
    transform: rotate(-90deg) scale(0.8);
  }
  to {
    opacity: 1;
    transform: rotate(-90deg) scale(1);
  }
}

.ring-bg {
  fill: none;
  stroke: #f0ebe3;
  stroke-width: 8;
}

.ring-progress {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.health-progress {
  stroke: url(#healthGradient);
  stroke: #FF8A80;
}

.happiness-progress {
  stroke: #FFB74D;
}

.cleanliness-progress {
  stroke: #81C784;
}

.pet-avatar {
  position: relative;
  z-index: 5;
  width: 120px;
  height: 120px;
  transition: transform 0.3s ease;
}

.pet-svg {
  width: 100%;
  height: 100%;
}

.pet-avatar.nod {
  animation: nod 0.6s ease-in-out;
}

.pet-avatar.jump {
  animation: jump 0.8s ease-out;
}

.pet-avatar.shake {
  animation: shake 0.7s ease-in-out;
}

@keyframes nod {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(5deg); }
}

@keyframes jump {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-25px) scale(1.1, 0.9); }
  50% { transform: translateY(-30px) scale(0.95, 1.05); }
  80% { transform: translateY(0) scale(1.05, 0.95); }
}

@keyframes shake {
  0%, 100% { transform: rotate(0deg) translateX(0); }
  20% { transform: rotate(-8deg) translateX(-5px); }
  40% { transform: rotate(8deg) translateX(5px); }
  60% { transform: rotate(-5deg) translateX(-3px); }
  80% { transform: rotate(5deg) translateX(3px); }
}

.pet-name {
  text-align: center;
  color: #5a4a42;
  font-size: 22px;
  font-weight: 600;
  margin-top: 16px;
}

.stats-panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 0 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: 14px;
  font-weight: 600;
  color: #7a6a62;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar-bg {
  flex: 1;
  height: 12px;
  background: #f0ebe3;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.health-bar {
  background: linear-gradient(90deg, #FF8A80 0%, #FF5252 100%);
}

.happiness-bar {
  background: linear-gradient(90deg, #FFB74D 0%, #FF9800 100%);
}

.cleanliness-bar {
  background: linear-gradient(90deg, #81C784 0%, #4CAF50 100%);
}

.stat-value {
  min-width: 42px;
  text-align: right;
  font-size: 14px;
  font-weight: 700;
  color: #5a4a42;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding-top: 8px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
}

.feed-btn {
  background: linear-gradient(135deg, #FFCDD2 0%, #FF8A80 100%);
  box-shadow: 0 6px 20px rgba(255, 138, 128, 0.35);
}

.bath-btn {
  background: linear-gradient(135deg, #C8E6C9 0%, #81C784 100%);
  box-shadow: 0 6px 20px rgba(129, 199, 132, 0.35);
}

.play-btn {
  background: linear-gradient(135deg, #FFE0B2 0%, #FFB74D 100%);
  box-shadow: 0 6px 20px rgba(255, 183, 77, 0.35);
}

.action-btn:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
}

.action-btn:active,
.action-btn.pressed {
  transform: translateY(1px) scale(0.96);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn-icon {
  font-size: 28px;
}

.btn-text {
  font-size: 15px;
  font-weight: 600;
  color: #5a4a42;
}

@media (max-width: 480px) {
  .pet-card {
    padding: 24px 16px;
  }

  .title {
    font-size: 24px;
  }

  .rings-container {
    width: 220px;
    height: 220px;
  }

  .health-ring {
    width: 220px;
    height: 220px;
  }

  .happiness-ring {
    width: 195px;
    height: 195px;
  }

  .cleanliness-ring {
    width: 170px;
    height: 170px;
  }

  .pet-avatar {
    width: 100px;
    height: 100px;
  }

  .action-buttons {
    gap: 10px;
  }

  .action-btn {
    padding: 14px 8px;
  }

  .btn-icon {
    font-size: 24px;
  }

  .btn-text {
    font-size: 13px;
  }
}
</style>
