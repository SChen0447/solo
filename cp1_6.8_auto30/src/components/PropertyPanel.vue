<template>
  <Transition name="panel">
    <div v-if="visible" class="property-panel" :style="{ top: panelTop + 'px', left: panelLeft + 'px' }">
      <div class="panel-header">
        <span class="panel-title">图案属性</span>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="panel-body">
        <div class="property-item">
          <label>
            <span class="label-text">旋转</span>
            <span class="value-text">{{ Math.round(rotation) }}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            :value="rotation"
            @input="handleRotationChange"
            class="slider"
          />
        </div>
        <div class="property-item">
          <label>
            <span class="label-text">缩放</span>
            <span class="value-text">{{ scale.toFixed(2) }}x</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.01"
            :value="scale"
            @input="handleScaleChange"
            class="slider"
          />
        </div>
        <div class="property-item">
          <label>
            <span class="label-text">透明度</span>
            <span class="value-text">{{ opacity.toFixed(2) }}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="opacity"
            @input="handleOpacityChange"
            class="slider"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  rotation: number
  scale: number
  opacity: number
  panelTop: number
  panelLeft: number
}>()

const emit = defineEmits<{
  (e: 'update:rotation', value: number): void
  (e: 'update:scale', value: number): void
  (e: 'update:opacity', value: number): void
  (e: 'close'): void
}>()

function handleRotationChange(e: Event): void {
  const target = e.target as HTMLInputElement
  emit('update:rotation', Number(target.value))
}

function handleScaleChange(e: Event): void {
  const target = e.target as HTMLInputElement
  emit('update:scale', Number(target.value))
}

function handleOpacityChange(e: Event): void {
  const target = e.target as HTMLInputElement
  emit('update:opacity', Number(target.value))
}
</script>

<style scoped>
.property-panel {
  position: fixed;
  width: 260px;
  background: var(--nav-bg, rgba(26, 26, 46, 0.9));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
  user-select: none;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #fff);
  letter-spacing: 0.5px;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(255,255,255,0.6));
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-color, #fff);
}

.panel-body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.property-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-item label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label-text {
  font-size: 12px;
  color: var(--text-muted, rgba(255,255,255,0.6));
  letter-spacing: 0.3px;
}

.value-text {
  font-size: 12px;
  color: var(--primary-color, #667eea);
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color, #667eea);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color, #667eea);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.panel-enter-active,
.panel-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.96);
}
</style>
