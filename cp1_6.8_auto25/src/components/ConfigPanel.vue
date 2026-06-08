<template>
  <div class="config-panel">
    <h2 class="panel-title">配置面板</h2>

    <div class="config-section">
      <h3 class="section-title">节点设置</h3>

      <div class="config-item">
        <label class="config-label">节点大小</label>
        <div class="slider-container">
          <input
            type="range"
            :value="config.nodeSize"
            min="10"
            max="30"
            step="1"
            @input="handleNodeSizeChange"
            class="slider"
          />
          <span class="slider-value">{{ config.nodeSize }}px</span>
        </div>
      </div>

      <div class="config-item">
        <label class="config-label">连线颜色</label>
        <div class="color-swatch-row">
          <div
            v-for="color in lineColors"
            :key="color"
            class="color-swatch"
            :class="{ active: config.lineColor === color }"
            :style="{ backgroundColor: color }"
            @click="handleLineColorChange(color)"
          ></div>
        </div>
      </div>

      <div class="config-item">
        <label class="config-label">连线粗细</label>
        <div class="slider-container">
          <input
            type="range"
            :value="config.lineWidth"
            min="1"
            max="10"
            step="1"
            @input="handleLineWidthChange"
            class="slider"
          />
          <span class="slider-value">{{ config.lineWidth }}px</span>
        </div>
      </div>
    </div>

    <div class="config-section">
      <h3 class="section-title">背景样式</h3>

      <div class="bg-type-selector">
        <button
          v-for="bg in bgTypes"
          :key="bg.value"
          class="bg-type-btn"
          :class="{ active: config.bgType === bg.value }"
          @click="handleBgTypeChange(bg.value)"
        >
          <div class="bg-preview" :class="'bg-' + bg.value"></div>
          <span>{{ bg.label }}</span>
        </button>
      </div>

      <div v-if="config.bgType === 'gradient'" class="config-item gradient-config">
        <label class="config-label">渐变颜色</label>
        <div class="gradient-colors">
          <div class="color-input-group">
            <span class="color-input-label">起始</span>
            <input
              type="color"
              :value="config.bgGradientStart"
              @input="handleGradientStartChange"
              class="color-input"
            />
          </div>
          <div class="color-input-group">
            <span class="color-input-label">结束</span>
            <input
              type="color"
              :value="config.bgGradientEnd"
              @input="handleGradientEndChange"
              class="color-input"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="config-section">
      <h3 class="section-title">操作</h3>
      <div class="action-buttons">
        <button class="action-btn reset-btn" @click="$emit('reset')">
          <span class="btn-icon">↻</span>
          重置路径
        </button>
        <button class="action-btn save-btn" @click="$emit('save')">
          <span class="btn-icon">↓</span>
          保存图案
        </button>
        <button class="action-btn share-btn" @click="$emit('share')">
          <span class="btn-icon">🔗</span>
          复制链接
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GestureConfig } from '../types'
import { COLOR_PALETTE } from '../types'

const props = defineProps<{
  config: GestureConfig
}>()

const emit = defineEmits<{
  (e: 'update:config', config: GestureConfig): void
  (e: 'reset'): void
  (e: 'save'): void
  (e: 'share'): void
}>()

const lineColors = COLOR_PALETTE.slice(0, 8)

const bgTypes = [
  { value: 'gradient', label: '纯色渐变' },
  { value: 'grid', label: '像素网格' },
  { value: 'stars', label: '星空粒子' }
]

const updateConfig = (partial: Partial<GestureConfig>) => {
  emit('update:config', { ...props.config, ...partial })
}

const handleNodeSizeChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  updateConfig({ nodeSize: parseInt(target.value) })
}

const handleLineColorChange = (color: string) => {
  updateConfig({ lineColor: color })
}

const handleLineWidthChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  updateConfig({ lineWidth: parseInt(target.value) })
}

const handleBgTypeChange = (type: 'gradient' | 'grid' | 'stars') => {
  updateConfig({ bgType: type })
}

const handleGradientStartChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  updateConfig({ bgGradientStart: target.value })
}

const handleGradientEndChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  updateConfig({ bgGradientEnd: target.value })
}
</script>

<style scoped>
.config-panel {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background: #16213e;
}

.panel-title {
  font-size: 20px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(233, 69, 96, 0.3);
}

.config-section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #e94560;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.config-item {
  margin-bottom: 20px;
}

.config-label {
  display: block;
  font-size: 13px;
  color: #bdc3c7;
  margin-bottom: 10px;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #1a1a2e;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e94560;
  cursor: pointer;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 8px rgba(233, 69, 96, 0.4);
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e94560;
  cursor: pointer;
  border: none;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 8px rgba(233, 69, 96, 0.4);
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

.slider-value {
  font-size: 13px;
  color: #e0e0e0;
  min-width: 40px;
  text-align: right;
  font-family: monospace;
}

.color-swatch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 3px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.color-swatch:hover {
  transform: scale(1.15);
}

.color-swatch.active {
  border-color: #fff;
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
}

.bg-type-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.bg-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  background: #1a1a2e;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #e0e0e0;
  font-size: 12px;
}

.bg-type-btn:hover {
  transform: scale(1.05);
  border-color: rgba(233, 69, 96, 0.5);
}

.bg-type-btn.active {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.1);
}

.bg-preview {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
}

.bg-gradient {
  background: radial-gradient(circle, #1a1a2e 0%, #16213e 100%);
}

.bg-grid {
  background-image:
    linear-gradient(rgba(233, 69, 96, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(233, 69, 96, 0.2) 1px, transparent 1px);
  background-size: 8px 8px;
  background-color: #1a1a2e;
}

.bg-stars {
  background: linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%);
  position: relative;
}

.bg-stars::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(2px 2px at 20% 30%, white, transparent),
              radial-gradient(1px 1px at 60% 70%, white, transparent),
              radial-gradient(1.5px 1.5px at 80% 20%, white, transparent);
  background-size: 100% 100%;
}

.gradient-config {
  margin-top: 16px;
}

.gradient-colors {
  display: flex;
  gap: 16px;
}

.color-input-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.color-input-label {
  font-size: 11px;
  color: #95a5a6;
}

.color-input {
  width: 50px;
  height: 36px;
  border: 2px solid #1a1a2e;
  border-radius: 8px;
  cursor: pointer;
  background: none;
  padding: 2px;
  transition: border-color 0.2s ease;
}

.color-input:hover {
  border-color: #e94560;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.action-btn:hover {
  transform: scale(1.05);
}

.action-btn:active {
  transform: scale(0.98);
}

.btn-icon {
  font-size: 16px;
}

.reset-btn {
  background: #2c3e50;
  color: #e0e0e0;
}

.reset-btn:hover {
  background: #34495e;
}

.save-btn {
  background: #e94560;
  color: white;
}

.save-btn:hover {
  background: #ff6b7f;
  box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);
}

.share-btn {
  background: #0f3460;
  color: white;
}

.share-btn:hover {
  background: #1a5276;
}

.config-panel::-webkit-scrollbar {
  width: 6px;
}

.config-panel::-webkit-scrollbar-track {
  background: #1a1a2e;
}

.config-panel::-webkit-scrollbar-thumb {
  background: #e94560;
  border-radius: 3px;
}
</style>
