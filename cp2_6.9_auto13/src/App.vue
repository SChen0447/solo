<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storiesData } from './storiesData'
import StoryCard from './components/StoryCard.vue'
import StoryTimeline from './components/StoryTimeline.vue'

const currentIndex = ref(0)
const isTransitioning = ref(false)

const currentStory = computed(() => storiesData[currentIndex.value])

const bgStyle = computed(() => ({
  backgroundColor: currentStory.value.bgColor,
  transition: 'background-color 600ms ease'
}))

let wheelTimeout: number | null = null

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  if (isTransitioning.value) return
  if (wheelTimeout !== null) return
  wheelTimeout = window.setTimeout(() => {
    wheelTimeout = null
  }, 600)
  isTransitioning.value = true
  setTimeout(() => {
    isTransitioning.value = false
  }, 600)
  if (e.deltaY > 0) {
    goNext()
  } else {
    goPrev()
  }
}

function goNext() {
  currentIndex.value = (currentIndex.value + 1) % storiesData.length
}

function goPrev() {
  currentIndex.value = (currentIndex.value - 1 + storiesData.length) % storiesData.length
}

function updateCurrentIndex(index: number) {
  if (isTransitioning.value) return
  if (index === currentIndex.value) return
  isTransitioning.value = true
  setTimeout(() => {
    isTransitioning.value = false
  }, 600)
  currentIndex.value = index
}

onMounted(() => {
  window.addEventListener('wheel', handleWheel, { passive: false })
})

onUnmounted(() => {
  window.removeEventListener('wheel', handleWheel)
  if (wheelTimeout !== null) {
    clearTimeout(wheelTimeout)
  }
})
</script>

<template>
  <div class="app-wrapper" :style="bgStyle">
    <div class="cards-container">
      <TransitionGroup name="card-slide" tag="div" class="cards-inner">
        <StoryCard
          v-for="story in storiesData"
          :key="story.id"
          v-show="story.id === currentStory.id"
          :story="story"
          :is-active="story.id === currentStory.id"
        />
      </TransitionGroup>
    </div>
    <div class="timeline-wrapper">
      <StoryTimeline
        :total="storiesData.length"
        :current-index="currentIndex"
        @update:current-index="updateCurrentIndex"
      />
    </div>
  </div>
</template>

<style scoped>
.app-wrapper {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #1a1a2e;
  transition: background-color 600ms ease;
  position: relative;
  overflow: hidden;
}

.cards-container {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
}

.cards-inner {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cards-inner > * {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.timeline-wrapper {
  width: 100%;
  padding: 2rem 0 3rem 0;
}

.card-slide-enter-active,
.card-slide-leave-active {
  transition: all 600ms cubic-bezier(0.25, 0.1, 0.25, 1);
}

.card-slide-enter-from {
  opacity: 0;
  transform: translate(calc(-50% + 40px), -50%);
}

.card-slide-enter-to {
  opacity: 1;
  transform: translate(-50%, -50%);
}

.card-slide-leave-from {
  opacity: 1;
  transform: translate(-50%, -50%);
}

.card-slide-leave-to {
  opacity: 0;
  transform: translate(calc(-50% - 40px), -50%);
}
</style>
