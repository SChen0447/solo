import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'

export type Mood = 'happy' | 'normal' | 'sad'
export type AnimationType = 'idle' | 'nod' | 'jump' | 'shake'

export const usePetStore = defineStore('pet', () => {
  const name = ref('小萌')
  const health = ref(80)
  const happiness = ref(75)
  const cleanliness = ref(85)
  const maxValue = 100
  const minValue = 0

  const currentAnimation = ref<AnimationType>('idle')
  let animationTimeout: ReturnType<typeof setTimeout> | null = null

  const healthDecayInterval = 60000
  const happinessDecayInterval = 40000
  const cleanlinessDecayInterval = 90000

  let healthTimer: ReturnType<typeof setInterval> | null = null
  let happinessTimer: ReturnType<typeof setInterval> | null = null
  let cleanlinessTimer: ReturnType<typeof setInterval> | null = null

  const mood = computed<Mood>(() => {
    const avg = (health.value + happiness.value + cleanliness.value) / 3
    if (avg >= 70) return 'happy'
    if (avg >= 40) return 'normal'
    return 'sad'
  })

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

  const playAnimation = (type: AnimationType, duration = 800) => {
    if (animationTimeout) {
      clearTimeout(animationTimeout)
    }
    currentAnimation.value = type
    animationTimeout = setTimeout(() => {
      currentAnimation.value = 'idle'
      animationTimeout = null
    }, duration)
  }

  const feed = () => {
    health.value = clamp(health.value + 15, minValue, maxValue)
    playAnimation('nod', 600)
  }

  const bath = () => {
    cleanliness.value = clamp(cleanliness.value + 20, minValue, maxValue)
    playAnimation('shake', 700)
  }

  const play = () => {
    happiness.value = clamp(happiness.value + 18, minValue, maxValue)
    playAnimation('jump', 800)
  }

  const startDecayTimers = () => {
    stopDecayTimers()

    healthTimer = setInterval(() => {
      health.value = clamp(health.value - 1, minValue, maxValue)
    }, healthDecayInterval)

    happinessTimer = setInterval(() => {
      happiness.value = clamp(happiness.value - 1, minValue, maxValue)
    }, happinessDecayInterval)

    cleanlinessTimer = setInterval(() => {
      cleanliness.value = clamp(cleanliness.value - 1, minValue, maxValue)
    }, cleanlinessDecayInterval)
  }

  const stopDecayTimers = () => {
    if (healthTimer) {
      clearInterval(healthTimer)
      healthTimer = null
    }
    if (happinessTimer) {
      clearInterval(happinessTimer)
      happinessTimer = null
    }
    if (cleanlinessTimer) {
      clearInterval(cleanlinessTimer)
      cleanlinessTimer = null
    }
    if (animationTimeout) {
      clearTimeout(animationTimeout)
      animationTimeout = null
    }
  }

  const cleanup = () => {
    stopDecayTimers()
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    name,
    health,
    happiness,
    cleanliness,
    maxValue,
    minValue,
    mood,
    currentAnimation,
    feed,
    bath,
    play,
    startDecayTimers,
    stopDecayTimers,
    cleanup
  }
})
