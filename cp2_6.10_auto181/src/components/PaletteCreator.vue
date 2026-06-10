<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ColorItem } from '../types'
import { generatePalette, hslToHex, hexToHsl, getContrastColor } from '../utils/colorUtils'

const props = defineProps<{
  colors: ColorItem[]
  schemeName: string
  floating?: boolean
}>()

const emit = defineEmits<{
  'update:colors': [colors: ColorItem[]]
  'update:schemeName': [name: string]
  'download': []
}>()

const wheelRef = ref<HTMLDivElement | null>(null)
const dragIndex = ref<number | null>(null)
const editingIndex = ref<number | null>(null)
const localSchemeName = ref(props.schemeName)

const editingColor = computed(() => {
  if (editingIndex.value === null) return null
  return props.colors[editingIndex.value]
})

const handleWheelClick = (e: MouseEvent) => {
  if (!wheelRef.value) return
  const rect = wheelRef.value.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const x = e.clientX - rect.left - centerX
  const y = e.clientY - rect.top - centerY
  let angle = Math.atan2(y, x) * (180 / Math.PI) + 90
  if (angle < 0) angle += 360
  const newColors = generatePalette(angle, props.colors)
  emit('update:colors', newColors)
}

const toggleLock = (index: number) => {
  const newColors = props.colors.map((c, i) =>
    i === index ? { ...c, locked: !c.locked } : c
  )
  emit('update:colors', newColors)
}

const handleDragStart = (index: number) => {
  dragIndex.value = index
}

const handleDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (dragIndex.value === null || dragIndex.value === index) return
  const newColors = [...props.colors]
  const [dragged] = newColors.splice(dragIndex.value, 1)
  newColors.splice(index, 0, dragged)
  dragIndex.value = index
  emit('update:colors', newColors)
}

const handleDragEnd = () => {
  dragIndex.value = null
}

const openColorEditor = (index: number) => {
  editingIndex.value = index
}

const closeColorEditor = () => {
  editingIndex.value = null
}

const updateColorHSL = (h: number, s: number, l: number) => {
  if (editingIndex.value === null) return
  const hex = hslToHex(h, s, l)
  const newColors = props.colors.map((c, i) =>
    i === editingIndex.value ? { ...c, hex, h, s, l } : c
  )
  emit('update:colors', newColors)
}

const handleDownload = () => {
  emit('update:schemeName', localSchemeName.value)
  emit('download')
}

const randomize = () => {
  const baseHue = Math.floor(Math.random() * 360)
  const newColors = generatePalette(baseHue, props.colors)
  emit('update:colors', newColors)
}
</script>

<template>
  <div class="palette-creator" :class="{ 'is-floating': floating }">
    <template v-if="!floating">
      <div class="section-header">
        <h3>配色方案</h3>
        <button class="random-btn" @click="randomize" title="随机生成">
          <i class="fas fa-random"></i>
        </button>
      </div>

      <div class="color-wheel-container">
        <div
          ref="wheelRef"
          class="color-wheel"
          @click="handleWheelClick"
        >
          <div class="wheel-center"></div>
        </div>
        <p class="hint">点击色轮任意位置生成配色</p>
      </div>
    </template>

    <div class="color-list" :class="{ 'horizontal': floating }">
      <div
        v-for="(color, index) in colors"
        :key="index"
        class="color-item"
        :class="{ 'dragging': dragIndex === index }"
        draggable="true"
        @dragstart="handleDragStart(index)"
        @dragover="(e) => handleDragOver(e, index)"
        @dragend="handleDragEnd"
        @click="openColorEditor(index)"
      >
        <div class="color-swatch" :style="{ background: color.hex }">
          <span v-if="color.locked" class="lock-icon">
            <i class="fas fa-lock"></i>
          </span>
        </div>
        <span v-if="!floating" class="color-hex">{{ color.hex.toUpperCase() }}</span>
        <button
          v-if="!floating"
          class="lock-btn"
          @click.stop="toggleLock(index)"
          :class="{ locked: color.locked }"
          :title="color.locked ? '解锁' : '锁定'"
        >
          <i :class="color.locked ? 'fas fa-lock' : 'fas fa-lock-open'"></i>
        </button>
      </div>
    </div>

    <div
      v-if="editingIndex !== null && editingColor"
      class="hsl-editor"
      @click.stop
    >
      <div class="editor-header">
        <span>HSL 微调</span>
        <button class="close-btn" @click="closeColorEditor">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="editor-preview" :style="{ background: editingColor.hex }">
        <span :style="{ color: getContrastColor(editingColor.hex) }">
          {{ editingColor.hex.toUpperCase() }}
        </span>
      </div>
      <div class="slider-group">
        <label>H ({{ Math.round(editingColor.h) }}°)</label>
        <input
          type="range"
          min="0"
          max="360"
          :value="editingColor.h"
          @input="(e) => updateColorHSL(
            Number((e.target as HTMLInputElement).value),
            editingColor.s,
            editingColor.l
          )"
        />
      </div>
      <div class="slider-group">
        <label>S ({{ Math.round(editingColor.s) }}%)</label>
        <input
          type="range"
          min="0"
          max="100"
          :value="editingColor.s"
          @input="(e) => updateColorHSL(
            editingColor.h,
            Number((e.target as HTMLInputElement).value),
            editingColor.l
          )"
        />
      </div>
      <div class="slider-group">
        <label>L ({{ Math.round(editingColor.l) }}%)</label>
        <input
          type="range"
          min="0"
          max="100"
          :value="editingColor.l"
          @input="(e) => updateColorHSL(
            editingColor.h,
            editingColor.s,
            Number((e.target as HTMLInputElement).value)
          )"
        />
      </div>
    </div>

    <template v-if="!floating">
      <div class="download-section">
        <input
          v-model="localSchemeName"
          type="text"
          placeholder="输入方案名称"
          class="name-input"
          @input="emit('update:schemeName', localSchemeName)"
        />
        <button class="download-btn" @click="handleDownload">
          <i class="fas fa-download"></i> 下载方案
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.palette-creator {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.palette-creator.is-floating {
  padding: 0;
  gap: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header h3 {
  margin: 0;
  font-size: 15px;
  color: #333;
  font-weight: 600;
}

.random-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease-out;
}

.random-btn:hover {
  background: #e0e0e0;
  transform: scale(1.05);
}

.color-wheel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.color-wheel {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: conic-gradient(
    hsl(0, 70%, 80%),
    hsl(60, 70%, 80%),
    hsl(120, 70%, 80%),
    hsl(180, 70%, 80%),
    hsl(240, 70%, 80%),
    hsl(300, 70%, 80%),
    hsl(360, 70%, 80%)
  );
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease-out;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.color-wheel:hover {
  transform: scale(1.02);
}

.wheel-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #fff;
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.1);
}

.hint {
  margin: 0;
  font-size: 11px;
  color: #999;
}

.color-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.color-list.horizontal {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: grab;
  user-select: none;
}

.color-item.dragging {
  opacity: 0.5;
}

.color-list.horizontal .color-item {
  cursor: pointer;
}

.color-swatch {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  position: relative;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease-out;
}

.color-swatch:hover {
  transform: scale(1.05);
}

.lock-icon {
  position: absolute;
  top: -6px;
  left: -6px;
  width: 18px;
  height: 18px;
  background: #ff6b6b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 9px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.color-hex {
  font-size: 12px;
  color: #666;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

.lock-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: #f0f0f0;
  cursor: pointer;
  color: #999;
  font-size: 11px;
  transition: all 0.2s ease-out;
}

.lock-btn:hover {
  transform: scale(1.05);
  background: #e0e0e0;
}

.lock-btn.locked {
  background: #ff6b6b;
  color: #fff;
}

.hsl-editor {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #e0e0e0;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  border: none;
  background: none;
  cursor: pointer;
  color: #999;
  font-size: 14px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease-out;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.editor-preview {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.slider-group label {
  font-size: 11px;
  color: #666;
}

.slider-group input[type='range'] {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #e0e0e0;
  border-radius: 2px;
  outline: none;
}

.slider-group input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2d2d2d;
  cursor: pointer;
  transition: transform 0.2s ease-out;
}

.slider-group input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.download-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #e8e8e8;
}

.name-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f5f5f5;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease-out;
}

.name-input:focus {
  border-color: #999;
  background: #fff;
}

.download-btn {
  width: 100%;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #2d2d2d;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.download-btn:hover {
  background: #1a1a1a;
  transform: scale(1.02);
}
</style>
