<script setup lang="ts">
import { ref, computed } from 'vue'
import TestPanel from '@/components/TestPanel.vue'
import ResultsPanel from '@/components/ResultsPanel.vue'
import type { UserChoice, AnalysisResult } from '@/types'
import { analyzeTaste } from '@/utils/tasteAnalyzer'
import { MOVIES } from '@/data/movies'

const TOTAL_MOVIES = MOVIES.length

type Stage = 'test' | 'results'

const stage = ref<Stage>('test')
const userChoices = ref<UserChoice[]>([])
const analysisResult = ref<AnalysisResult | null>(null)

const progress = computed(() => (userChoices.value.length / TOTAL_MOVIES) * 100)
const progressText = computed(() => `${userChoices.value.length}/${TOTAL_MOVIES}`)

function handleChoice(choice: UserChoice) {
  userChoices.value.push(choice)
  if (userChoices.value.length >= TOTAL_MOVIES) {
    setTimeout(() => {
      analysisResult.value = analyzeTaste(userChoices.value)
      stage.value = 'results'
    }, 500)
  }
}

function handleRestart() {
  userChoices.value = []
  analysisResult.value = null
  stage.value = 'test'
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">电影品味测试</h1>
      <p v-if="stage === 'test'" class="app-subtitle">选择你喜欢的电影</p>
    </header>

    <div v-if="stage === 'test'" class="progress-section">
      <div class="progress-bar-wrapper">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="progress-text">{{ progressText }}</div>
    </div>

    <main class="app-main">
      <TestPanel
        v-if="stage === 'test'"
        :choices-count="userChoices.length"
        @choice="handleChoice"
      />
      <ResultsPanel
        v-else-if="stage === 'results' && analysisResult"
        :result="analysisResult"
        @restart="handleRestart"
      />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-header {
  text-align: center;
  margin-bottom: 24px;
}

.app-title {
  font-size: 32px;
  font-weight: 700;
  color: #dcdde1;
  margin-bottom: 8px;
}

.app-subtitle {
  font-size: 14px;
  color: #7f8c8d;
}

.progress-section {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}

.progress-bar-wrapper {
  width: 60%;
  height: 8px;
  background-color: #ccc;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4ecdc4 0%, #44bd32 100%);
  border-radius: 4px;
  transition: width 0.3s ease-out;
}

.progress-text {
  margin-top: 8px;
  font-size: 14px;
  color: #dcdde1;
}

.app-main {
  width: 100%;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .app-title {
    font-size: 24px;
  }

  .progress-bar-wrapper {
    width: 80%;
  }
}
</style>
