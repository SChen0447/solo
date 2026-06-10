<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  Chart,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'
import html2canvas from 'html2canvas'
import type { AnalysisResult, TasteDimensionKey } from '@/types'
import { DIMENSION_LABELS, DIMENSION_COLORS } from '@/types'

Chart.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const props = defineProps<{
  result: AnalysisResult
}>()

const emit = defineEmits<{
  restart: []
}>()

const radarCanvas = ref<HTMLCanvasElement | null>(null)
const posterArea = ref<HTMLDivElement | null>(null)
let chartInstance: Chart | null = null
const downloadUrl = ref<string | null>(null)
const generatingPoster = ref(false)

const dimensionKeys: TasteDimensionKey[] = [
  'artistic',
  'commercial',
  'rhythm',
  'plotComplexity',
  'visualStyle',
  'emotionalImpact'
]

function initChart() {
  if (!radarCanvas.value) return

  const ctx = radarCanvas.value.getContext('2d')
  if (!ctx) return

  const labels = dimensionKeys.map((k) => DIMENSION_LABELS[k])
  const dataValues = dimensionKeys.map((k) => props.result.dimensions[k])

  chartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: '品味得分',
          data: new Array(dimensionKeys.length).fill(0),
          borderColor: '#4ecdc4',
          backgroundColor: 'rgba(78, 205, 196, 0.35)',
          borderWidth: 2,
          pointBackgroundColor: '#4ecdc4',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 500,
        easing: 'easeOutQuart'
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            color: '#7f8c8d',
            backdropColor: 'transparent',
            font: { size: 10 }
          },
          grid: {
            color: 'rgba(127, 140, 141, 0.3)'
          },
          angleLines: {
            color: 'rgba(127, 140, 141, 0.3)'
          },
          pointLabels: {
            color: '#dcdde1',
            font: { size: 13, weight: '500' }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(45, 52, 54, 0.9)',
          titleColor: '#dcdde1',
          bodyColor: '#dcdde1',
          borderColor: '#4ecdc4',
          borderWidth: 1
        }
      }
    }
  })

  setTimeout(() => {
    if (chartInstance) {
      chartInstance.data.datasets[0].data = dataValues
      chartInstance.update()
    }
  }, 100)
}

async function generatePoster() {
  if (!posterArea.value || generatingPoster.value) return

  generatingPoster.value = true
  downloadUrl.value = null

  try {
    await nextTick()
    const canvas = await html2canvas(posterArea.value, {
      backgroundColor: '#1e272e',
      scale: 2,
      useCORS: true,
      logging: false
    })

    downloadUrl.value = canvas.toDataURL('image/png')
  } catch (err) {
    console.error('海报生成失败:', err)
  } finally {
    generatingPoster.value = false
  }
}

onMounted(() => {
  initChart()
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
  if (downloadUrl.value) {
    URL.revokeObjectURL(downloadUrl.value)
  }
})
</script>

<template>
  <div class="results-panel">
    <div ref="posterArea" class="poster-area">
      <div class="poster-header">
        <h2 class="poster-title">我的电影品味画像</h2>
        <p class="poster-subtitle">{{ DIMENSION_LABELS[result.topDimension] }} · 爱好者</p>
      </div>

      <div class="radar-container">
        <canvas ref="radarCanvas" class="radar-canvas"></canvas>
      </div>

      <div class="scores-list">
        <div
          v-for="key in dimensionKeys"
          :key="key"
          class="score-item"
        >
          <span
            class="score-dot"
            :style="{ backgroundColor: DIMENSION_COLORS[key] }"
          ></span>
          <span class="score-label">{{ DIMENSION_LABELS[key] }}</span>
          <span class="score-value">{{ result.dimensions[key] }}</span>
        </div>
      </div>

      <p class="summary-text">{{ result.summary }}</p>
    </div>

    <div class="actions-section">
      <button class="poster-btn" @click="generatePoster" :disabled="generatingPoster">
        {{ generatingPoster ? '生成中...' : '生成品味海报' }}
      </button>

      <a
        v-if="downloadUrl"
        :href="downloadUrl"
        download="我的电影品味海报.png"
        class="download-link"
      >
        下载海报图片
      </a>

      <button class="restart-btn" @click="emit('restart')">
        重新测试
      </button>
    </div>
  </div>
</template>

<style scoped>
.results-panel {
  width: 100%;
  max-width: 540px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.poster-area {
  width: 100%;
  background-color: #2d3436;
  border-radius: 16px;
  padding: 32px 24px;
  margin-bottom: 24px;
}

.poster-header {
  text-align: center;
  margin-bottom: 24px;
}

.poster-title {
  font-size: 24px;
  font-weight: 700;
  color: #dcdde1;
  margin-bottom: 4px;
}

.poster-subtitle {
  font-size: 14px;
  color: #4ecdc4;
  font-weight: 500;
}

.radar-container {
  width: 300px;
  height: 300px;
  margin: 0 auto 24px;
}

.radar-canvas {
  width: 100% !important;
  height: 100% !important;
}

.scores-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 20px;
  margin-bottom: 20px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.score-label {
  font-size: 13px;
  color: #dcdde1;
  flex: 1;
}

.score-value {
  font-size: 14px;
  font-weight: 600;
  color: #4ecdc4;
}

.summary-text {
  font-size: 13px;
  line-height: 1.7;
  color: #bdc3c7;
  text-align: center;
  padding: 0 8px;
}

.actions-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.poster-btn {
  background-color: #2d3436;
  color: white;
  padding: 12px 28px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.poster-btn:hover:not(:disabled) {
  background-color: #636e72;
}

.poster-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.download-link {
  color: #4ecdc4;
  font-size: 13px;
  text-decoration: underline;
  transition: color 0.2s ease;
}

.download-link:hover {
  color: #44bd32;
}

.restart-btn {
  background: transparent;
  color: #7f8c8d;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid #7f8c8d;
  transition: all 0.2s ease;
}

.restart-btn:hover {
  color: #dcdde1;
  border-color: #dcdde1;
}

@media (max-width: 768px) {
  .radar-container {
    width: 200px;
    height: 200px;
  }

  .poster-title {
    font-size: 20px;
  }

  .scores-list {
    grid-template-columns: 1fr;
  }
}
</style>
