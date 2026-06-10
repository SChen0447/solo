<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { Itinerary, DayPlan, Spot } from './types'
import {
  createInitialItinerary,
  addDay,
  addSpot,
  removeSpot,
  updateSpot,
  moveSpot,
  removeDay,
  findSpotById,
  getTotalDuration,
  getTotalSpots,
  getSpotsPerDay,
  formatDuration,
  exportToJson,
  downloadJson,
  type DragState
} from './timeline'
import { updateMap } from './mapRenderer'

const STORAGE_KEY = 'travel-planner-itinerary'

const itinerary = ref<Itinerary>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)
const dayListRefs = reactive<Record<string, HTMLDivElement | null>>({})
const spotCardRefs = reactive<Record<string, HTMLDivElement | null>>({})

const addingSpotToDay = ref<string | null>(null)
const newSpotForm = reactive({ name: '', duration: 60, rating: 3 })

const isMobile = ref(false)
const isEditing = reactive<Record<string, boolean>>({})

const dragState = reactive<DragState>({
  isDragging: false,
  draggedSpotId: null,
  sourceDayId: null,
  targetDayId: null,
  targetIndex: -1,
  dropIndicatorDayId: null,
  dropIndicatorIndex: -1
})

const dragGhost = reactive({
  visible: false,
  x: 0,
  y: 0,
  spotName: ''
})

const totalDays = computed(() => itinerary.value.length)
const totalSpots = computed(() => getTotalSpots(itinerary.value))
const totalDuration = computed(() => formatDuration(getTotalDuration(itinerary.value)))
const spotsPerDay = computed(() => getSpotsPerDay(itinerary.value))
const maxSpotsPerDay = computed(() => Math.max(...spotsPerDay.value, 1))

const dayColors = ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f']
const getDayColor = (index: number) => dayColors[index % dayColors.length]

function checkMobile() {
  isMobile.value = window.innerWidth < 900
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary.value))
  } catch (e) {
    console.warn('Failed to save to localStorage', e)
  }
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        itinerary.value = parsed
        return true
      }
    }
  } catch (e) {
    console.warn('Failed to load from localStorage', e)
  }
  return false
}

function rerenderMap() {
  nextTick(() => {
    updateMap(canvasRef.value, itinerary.value)
  })
}

function handleAddDay() {
  itinerary.value = addDay(itinerary.value)
}

function handleRemoveDay(dayId: string) {
  itinerary.value = removeDay(itinerary.value, dayId)
}

function showAddSpotForm(dayId: string) {
  addingSpotToDay.value = dayId
  newSpotForm.name = ''
  newSpotForm.duration = 60
  newSpotForm.rating = 3
}

function hideAddSpotForm() {
  addingSpotToDay.value = null
}

function confirmAddSpot(dayId: string) {
  if (!newSpotForm.name.trim()) return
  itinerary.value = addSpot(itinerary.value, dayId, {
    name: newSpotForm.name.trim(),
    duration: newSpotForm.duration,
    rating: newSpotForm.rating
  })
  hideAddSpotForm()
}

function handleRemoveSpot(dayId: string, spotId: string) {
  itinerary.value = removeSpot(itinerary.value, dayId, spotId)
}

function startEditSpot(spotId: string) {
  isEditing[spotId] = true
}

function stopEditSpot(spotId: string) {
  isEditing[spotId] = false
}

function updateSpotField(dayId: string, spotId: string, field: keyof Spot, value: any) {
  itinerary.value = updateSpot(itinerary.value, dayId, spotId, { [field]: value })
}

function handleExport() {
  const json = exportToJson(itinerary.value)
  downloadJson(json)
}

function onDragStart(e: DragEvent, dayId: string, spot: Spot) {
  if (!e.dataTransfer) return
  dragState.isDragging = true
  dragState.draggedSpotId = spot.id
  dragState.sourceDayId = dayId
  dragState.targetDayId = dayId
  dragState.targetIndex = -1
  dragState.dropIndicatorDayId = null
  dragState.dropIndicatorIndex = -1

  dragGhost.visible = true
  dragGhost.spotName = spot.name

  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', spot.id)
  e.dataTransfer.setDragImage(new Image(), 0, 0)
}

function onDragMove(e: DragEvent) {
  if (!dragState.isDragging) return
  dragGhost.x = e.clientX
  dragGhost.y = e.clientY
}

function onDragOver(e: DragEvent, dayId: string) {
  e.preventDefault()
  if (!e.dataTransfer) return
  e.dataTransfer.dropEffect = 'move'

  const dayEl = dayListRefs[dayId]
  if (!dayEl) return

  const rect = dayEl.getBoundingClientRect()
  const y = e.clientY - rect.top

  const spotEls = dayEl.querySelectorAll('[data-spot-id]')
  let insertIndex = spotEls.length

  for (let i = 0; i < spotEls.length; i++) {
    const el = spotEls[i] as HTMLElement
    const elRect = el.getBoundingClientRect()
    const elTop = elRect.top - rect.top
    const elHeight = elRect.height
    if (y < elTop + elHeight / 2) {
      insertIndex = i
      break
    }
  }

  dragState.targetDayId = dayId
  dragState.targetIndex = insertIndex
  dragState.dropIndicatorDayId = dayId
  dragState.dropIndicatorIndex = insertIndex
}

function onDrop(e: DragEvent, dayId: string) {
  e.preventDefault()
  if (!dragState.draggedSpotId || !dragState.sourceDayId) return

  const srcDayId = dragState.sourceDayId
  const targetIdx = dragState.dropIndicatorIndex >= 0 ? dragState.dropIndicatorIndex : 0

  itinerary.value = moveSpot(
    itinerary.value,
    srcDayId,
    dragState.draggedSpotId,
    dayId,
    targetIdx
  )

  resetDragState()
}

function onDragEnd() {
  resetDragState()
}

function resetDragState() {
  dragState.isDragging = false
  dragState.draggedSpotId = null
  dragState.sourceDayId = null
  dragState.targetDayId = null
  dragState.targetIndex = -1
  dragState.dropIndicatorDayId = null
  dragState.dropIndicatorIndex = -1
  dragGhost.visible = false
}

function setDayListRef(el: HTMLDivElement | null, dayId: string) {
  if (el) {
    dayListRefs[dayId] = el
  } else {
    delete dayListRefs[dayId]
  }
}

function setSpotCardRef(el: HTMLDivElement | null, spotId: string) {
  if (el) {
    spotCardRefs[spotId] = el
  } else {
    delete spotCardRefs[spotId]
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const loaded = loadFromStorage()
  if (!loaded) {
    itinerary.value = createInitialItinerary()
  }

  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('dragover', onDragMove)

  nextTick(() => {
    rerenderMap()
  })

  if (canvasRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      rerenderMap()
    })
    resizeObserver.observe(canvasRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('dragover', onDragMove)
  if (resizeObserver && canvasRef.value) {
    resizeObserver.unobserve(canvasRef.value)
  }
})

watch(
  () => itinerary.value,
  () => {
    saveToStorage()
    rerenderMap()
  },
  { deep: true }
)

watch(isMobile, () => {
  rerenderMap()
})
</script>

<template>
  <div class="app" :class="{ 'app-mobile': isMobile }">
    <header class="header">
      <div class="header-left">
        <h1 class="title">旅行规划师</h1>
      </div>
      <div class="header-right">
        <div class="stats">
          <div class="stat-item">
            <span class="stat-value">{{ totalDays }}</span>
            <span class="stat-label">天</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ totalSpots }}</span>
            <span class="stat-label">景点</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ totalDuration }}</span>
            <span class="stat-label">总耗时</span>
          </div>
          <div class="chart-container">
            <div class="mini-chart">
              <div
                v-for="(count, idx) in spotsPerDay"
                :key="idx"
                class="chart-bar"
                :style="{
                  height: (count / maxSpotsPerDay) * 40 + 'px',
                  backgroundColor: '#81b29a'
                }"
              ></div>
            </div>
          </div>
        </div>
        <button class="btn-export" @click="handleExport">导出行程</button>
      </div>
    </header>

    <div class="main-content">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">行程日程</span>
          <button class="btn-add-day" @click="handleAddDay">+ 添加日期</button>
        </div>
        <div class="days-list">
          <div
            v-for="(day, dayIdx) in itinerary"
            :key="day.id"
            class="day-group"
          >
            <div class="day-header">
              <div class="day-title-wrap">
                <span class="day-color-dot" :style="{ backgroundColor: getDayColor(dayIdx) }"></span>
                <h2 class="day-title">{{ day.date }}</h2>
                <span class="day-count">{{ day.spots.length }}个景点</span>
              </div>
              <button
                v-if="itinerary.length > 1"
                class="btn-remove-day"
                @click="handleRemoveDay(day.id)"
                title="删除这天"
              >×</button>
            </div>

            <div
              class="day-spots"
              :ref="(el) => setDayListRef(el as HTMLDivElement | null, day.id)"
              @dragover="(e) => onDragOver(e as DragEvent, day.id)"
              @drop="(e) => onDrop(e as DragEvent, day.id)"
            >
              <template v-if="dragState.dropIndicatorDayId === day.id && dragState.dropIndicatorIndex === 0">
                <div class="drop-indicator"></div>
              </template>

              <template v-for="(spot, spotIdx) in day.spots" :key="spot.id">
                <div
                  class="spot-card"
                  :class="{
                    'spot-dragging': dragState.draggedSpotId === spot.id
                  }"
                  :ref="(el) => setSpotCardRef(el as HTMLDivElement | null, spot.id)"
                  draggable="true"
                  :data-spot-id="spot.id"
                  @dragstart="(e) => onDragStart(e as DragEvent, day.id, spot)"
                  @dragend="onDragEnd"
                >
                  <div class="spot-content">
                    <div class="spot-main">
                      <template v-if="isEditing[spot.id]">
                        <input
                          class="spot-name-input"
                          type="text"
                          :value="spot.name"
                          @input="(e) => updateSpotField(day.id, spot.id, 'name', (e.target as HTMLInputElement).value)"
                          @blur="stopEditSpot(spot.id)"
                          @keyup.enter="stopEditSpot(spot.id)"
                          autofocus
                        />
                      </template>
                      <template v-else>
                        <span class="spot-name" @dblclick="startEditSpot(spot.id)">{{ spot.name }}</span>
                      </template>
                      <div class="spot-duration">
                        <label class="duration-label">停留：</label>
                        <select
                          class="duration-select"
                          :value="spot.duration"
                          @change="(e) => updateSpotField(day.id, spot.id, 'duration', parseInt((e.target as HTMLSelectElement).value))"
                        >
                          <option v-for="m in [30,45,60,75,90,105,120,135,150,165,180,195,210,225,240]" :key="m" :value="m">
                            {{ formatDuration(m) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div class="spot-right">
                      <div class="rating">
                        <span
                          v-for="i in 5"
                          :key="i"
                          class="star"
                          :class="{ active: i <= spot.rating }"
                          @click="updateSpotField(day.id, spot.id, 'rating', i)"
                        >★</span>
                      </div>
                      <button class="btn-remove-spot" @click="handleRemoveSpot(day.id, spot.id)" title="删除">×</button>
                    </div>
                  </div>
                </div>

                <template v-if="dragState.dropIndicatorDayId === day.id && dragState.dropIndicatorIndex === spotIdx + 1">
                  <div class="drop-indicator"></div>
                </template>
              </template>
            </div>

            <div v-if="addingSpotToDay === day.id" class="add-spot-form">
              <input
                type="text"
                v-model="newSpotForm.name"
                placeholder="景点名称"
                class="spot-name-input"
                @keyup.enter="confirmAddSpot(day.id)"
              />
              <div class="form-row">
                <select v-model.number="newSpotForm.duration" class="duration-select">
                  <option v-for="m in [30,45,60,75,90,105,120,135,150,165,180,195,210,225,240]" :key="m" :value="m">
                    {{ formatDuration(m) }}
                  </option>
                </select>
                <div class="rating rating-edit">
                  <span
                    v-for="i in 5"
                    :key="i"
                    class="star"
                    :class="{ active: i <= newSpotForm.rating }"
                    @click="newSpotForm.rating = i"
                  >★</span>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn-cancel" @click="hideAddSpotForm">取消</button>
                <button class="btn-confirm" @click="confirmAddSpot(day.id)">确认</button>
              </div>
            </div>

            <button
              v-else
              class="btn-add-spot"
              @click="showAddSpotForm(day.id)"
            >+ 添加景点</button>
          </div>
        </div>
      </aside>

      <section class="map-section">
        <canvas ref="canvasRef" class="map-canvas"></canvas>
      </section>
    </div>

    <div
      v-if="dragGhost.visible"
      class="drag-ghost"
      :style="{ left: dragGhost.x + 'px', top: dragGhost.y + 'px' }"
    >
      {{ dragGhost.spotName }}
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #f4f1de;
}

.app-mobile {
  overflow-y: auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: #2a2b38;
  color: #e0e1dd;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.header-left .title {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.stat-label {
  font-size: 12px;
  color: #e0e1dd;
}

.stat-divider {
  width: 1px;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.2);
}

.chart-container {
  margin-left: 8px;
}

.mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 44px;
  padding: 2px 0;
}

.chart-bar {
  width: 30px;
  border-radius: 3px 3px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;
}

.btn-export {
  padding: 8px 18px;
  background-color: #e07a5f;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-export:hover {
  background-color: #d66a4e;
}

.btn-export:active {
  transform: scale(0.97);
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-mobile .main-content {
  flex-direction: column;
}

.sidebar {
  width: 280px;
  background-color: #2a2b38;
  color: #e0e1dd;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.app-mobile .sidebar {
  width: 100%;
  max-height: 50vh;
  min-height: 200px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.btn-add-day {
  padding: 4px 10px;
  background-color: rgba(255, 255, 255, 0.1);
  color: #e0e1dd;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-add-day:hover {
  background-color: rgba(255, 255, 255, 0.18);
}

.days-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 14px;
}

.days-list::-webkit-scrollbar {
  width: 6px;
}

.days-list::-webkit-scrollbar-track {
  background: transparent;
}

.days-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.days-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.day-group {
  margin-bottom: 18px;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.day-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.day-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.day-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.day-count {
  font-size: 12px;
  color: #a0a1a0;
}

.btn-remove-day {
  width: 22px;
  height: 22px;
  background: transparent;
  color: #a0a1a0;
  border: none;
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, background-color 0.2s;
}

.btn-remove-day:hover {
  color: #e07a5f;
  background-color: rgba(224, 122, 95, 0.1);
}

.day-spots {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  min-height: 8px;
  padding: 2px 0;
}

.spot-card {
  height: 120px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3d405b 0%, #4a4e69 100%);
  padding: 12px 14px;
  cursor: grab;
  transition: transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  user-select: none;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.spot-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transform: translateY(-1px);
}

.spot-card:active {
  cursor: grabbing;
}

.spot-card.spot-dragging {
  opacity: 0.4;
  transform: scale(0.98);
}

.spot-content {
  display: flex;
  justify-content: space-between;
  height: 100%;
  gap: 8px;
}

.spot-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.spot-name {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spot-name-input {
  width: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  padding: 4px 8px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  outline: none;
}

.spot-name-input:focus {
  border-color: #e07a5f;
}

.spot-duration {
  display: flex;
  align-items: center;
  gap: 6px;
}

.duration-label {
  font-size: 12px;
  color: #a0a1a0;
}

.duration-select {
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  padding: 3px 6px;
  color: #e0e1dd;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.duration-select:focus {
  border-color: #e07a5f;
}

.duration-select option {
  background-color: #2a2b38;
  color: #e0e1dd;
}

.spot-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  flex-shrink: 0;
}

.rating {
  display: flex;
  gap: 1px;
}

.rating .star {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: color 0.15s ease, transform 0.1s ease;
}

.rating .star.active {
  color: #f4d03f;
}

.rating .star:hover {
  transform: scale(1.15);
}

.btn-remove-spot {
  width: 22px;
  height: 22px;
  background: transparent;
  color: #a0a1a0;
  border: none;
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, background-color 0.2s;
}

.btn-remove-spot:hover {
  color: #e07a5f;
  background-color: rgba(224, 122, 95, 0.15);
}

.drop-indicator {
  height: 2px;
  background-color: #4fc3f7;
  border-radius: 1px;
  margin: 2px 0;
  box-shadow: 0 0 6px rgba(79, 195, 247, 0.6);
  animation: pulseIndicator 1s ease-in-out infinite;
}

@keyframes pulseIndicator {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.add-spot-form {
  margin-top: 8px;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fadeIn 0.2s ease;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rating-edit .star {
  font-size: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel, .btn-confirm {
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s ease;
}

.btn-cancel {
  background-color: rgba(255, 255, 255, 0.1);
  color: #e0e1dd;
}

.btn-cancel:hover {
  background-color: rgba(255, 255, 255, 0.18);
}

.btn-confirm {
  background-color: #e07a5f;
  color: #ffffff;
  font-weight: 600;
}

.btn-confirm:hover {
  background-color: #d66a4e;
}

.btn-add-spot {
  width: 100%;
  margin-top: 8px;
  padding: 9px 0;
  background-color: #e07a5f;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-add-spot:hover {
  background-color: #d66a4e;
}

.btn-add-spot:active {
  transform: scale(0.98);
}

.map-section {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: #f4f1de;
}

.app-mobile .map-section {
  min-height: 400px;
}

.map-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.drag-ghost {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  padding: 8px 14px;
  background: linear-gradient(135deg, #3d405b 0%, #4a4e69 100%);
  color: #ffffff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  opacity: 0.9;
  transform: translate(-50%, -50%) rotate(-2deg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

@media (max-width: 900px) {
  .header {
    padding: 10px 14px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .header-left .title {
    font-size: 17px;
  }

  .header-right {
    flex-wrap: wrap;
    gap: 10px;
  }

  .stats {
    gap: 8px;
  }

  .stat-value {
    font-size: 15px;
  }

  .stat-label {
    font-size: 11px;
  }

  .chart-container {
    display: none;
  }

  .btn-export {
    padding: 6px 14px;
    font-size: 13px;
  }
}
</style>
