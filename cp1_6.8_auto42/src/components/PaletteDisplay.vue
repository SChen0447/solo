<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePaletteStore } from '@/stores/paletteStore'
import { HARMONY_RULES } from '@/types'
import type { HarmonyRule } from '@/types'

const store = usePaletteStore()
const editingIndex = ref<number | null>(null)
const editingName = ref('')
const tempHsl = ref({ h: 0, s: 0, l: 0 })

const sortedColors = computed(() => store.colors)

function startEdit(index: number) {
  editingIndex.value = index
  editingName.value = store.colors[index].name
  tempHsl.value = { ...store.colors[index].hsl }
}

function finishEdit() {
  if (editingIndex.value !== null) {
    store.updateColorName(editingIndex.value, editingName.value)
  }
  editingIndex.value = null
}

function handleSliderChange(type: 'h' | 's' | 'l', value: number) {
  if (editingIndex.value === null) return
  tempHsl.value[type] = value
  store.updateColor(editingIndex.value, { [type]: value })
}

function toggleLock(index: number) {
  store.toggleLock(index)
}

function applyRule(rule: HarmonyRule) {
  store.applyRule(rule)
}

function getTextColor(bgHex: string): string {
  const r = parseInt(bgHex.slice(1, 3), 16)
  const g = parseInt(bgHex.slice(3, 5), 16)
  const b = parseInt(bgHex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#333333' : '#FFFFFF'
}
</script>

<template>
  <div class="palette-container">
    <div class="harmony-rules">
      <button
        v-for="rule in HARMONY_RULES"
        :key="rule.key"
        class="rule-btn"
        :class="{ active: store.currentRule === rule.key }"
        :style="store.currentRule === rule.key ? { backgroundColor: sortedColors[0]?.hex, color: getTextColor(sortedColors[0]?.hex || '#333') } : {}"
        @click="applyRule(rule.key)"
      >
        {{ rule.label }}
      </button>
    </div>

    <div class="color-list">
      <div
        v-for="(color, index) in sortedColors"
        :key="color.id"
        class="color-swatch"
        :class="{ locked: color.locked, editing: editingIndex === index }"
        :style="{ backgroundColor: color.hex, transitionDelay: `${index * 0.05}s` }"
        @click="startEdit(index)"
      >
        <div class="swatch-info" :style="{ color: getTextColor(color.hex) }">
          <span class="swatch-hex">{{ color.hex.toUpperCase() }}</span>
          <span class="swatch-name">{{ color.name }}</span>
        </div>
        <button
          class="lock-btn"
          :style="{ color: getTextColor(color.hex) }"
          @click.stop="toggleLock(index)"
        >
          {{ color.locked ? '🔒' : '🔓' }}
        </button>

        <div
          v-if="editingIndex === index"
          class="edit-panel"
          @click.stop
        >
          <div class="edit-header">
            <input
              v-model="editingName"
              type="text"
              class="name-input"
              placeholder="颜色名称"
              @blur="finishEdit"
              @keyup.enter="finishEdit"
            />
          </div>

          <div class="slider-group">
            <label>色相 (H): {{ tempHsl.h }}°</label>
            <input
              type="range"
              min="0"
              max="360"
              :value="tempHsl.h"
              class="slider h-slider"
              @input="handleSliderChange('h', Number(($event.target as HTMLInputElement).value))"
            />
          </div>

          <div class="slider-group">
            <label>饱和度 (S): {{ tempHsl.s }}%</label>
            <input
              type="range"
              min="0"
              max="100"
              :value="tempHsl.s"
              class="slider s-slider"
              @input="handleSliderChange('s', Number(($event.target as HTMLInputElement).value))"
            />
          </div>

          <div class="slider-group">
            <label>亮度 (L): {{ tempHsl.l }}%</label>
            <input
              type="range"
              min="0"
              max="100"
              :value="tempHsl.l"
              class="slider l-slider"
              @input="handleSliderChange('l', Number(($event.target as HTMLInputElement).value))"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.palette-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.harmony-rules {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.rule-btn {
  padding: 8px 20px;
  border-radius: 20px;
  background: #e0e0e0;
  color: #666;
  font-size: 13px;
  font-weight: 500;
}

.rule-btn:hover {
  background: #d0d0d0;
  transform: translateY(-1px);
}

.rule-btn.active {
  color: white;
}

.color-list {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.color-swatch {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.5s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: visible;
}

.color-swatch:hover {
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.color-swatch.locked::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.swatch-info {
  position: absolute;
  bottom: 6px;
  left: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.color-swatch:hover .swatch-info {
  opacity: 1;
}

.swatch-hex {
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.swatch-name {
  font-size: 10px;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.lock-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: transparent;
  font-size: 14px;
  padding: 2px 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.color-swatch:hover .lock-btn {
  opacity: 1;
}

.lock-btn:hover {
  transform: scale(1.2);
}

.edit-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  transform-origin: top center;
  width: 200px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 100;
  animation: panelIn 0.2s ease forwards;
}

@keyframes panelIn {
  from {
    opacity: 0;
    transform: translateX(-50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}

.edit-header {
  margin-bottom: 12px;
}

.name-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
}

.name-input:focus {
  border-color: #4a90d9;
}

.slider-group {
  margin-bottom: 12px;
}

.slider-group:last-child {
  margin-bottom: 0;
}

.slider-group label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.h-slider {
  background: linear-gradient(
    to right,
    #ff0000,
    #ffff00,
    #00ff00,
    #00ffff,
    #0000ff,
    #ff00ff,
    #ff0000
  );
}

.s-slider {
  background: linear-gradient(to right, #ccc, #4a90d9);
}

.l-slider {
  background: linear-gradient(to right, #000, #fff);
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  border: 2px solid #999;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider::-webkit-slider-thumb:hover {
  border-color: #666;
}

@media (max-width: 1024px) {
  .color-list {
    gap: 8px;
  }

  .color-swatch {
    width: 60px;
    height: 60px;
  }
}
</style>
