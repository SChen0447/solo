<template>
  <aside class="property-panel" :class="{ collapsed: !element }">
    <div class="panel-header">
      <span class="panel-title">属性面板</span>
    </div>

    <div v-if="element" class="panel-content">
      <div class="property-section">
        <div class="section-title">基本信息</div>
        <div class="property-row">
          <label>类型</label>
          <span class="value-text">{{ elementTypeLabel }}</span>
        </div>
        <div class="property-row">
          <label>名称</label>
          <input
            type="text"
            :value="element.label"
            @input="updateLabel"
            class="input-text"
          />
        </div>
      </div>

      <div class="property-section">
        <div class="section-title">位置</div>
        <div class="property-row">
          <label>X</label>
          <div class="input-with-slider">
            <input
              type="range"
              :value="element.style.x"
              min="0"
              max="2000"
              step="1"
              @input="updateStyle('x', $event)"
              class="slider"
            />
            <input
              type="number"
              :value="element.style.x"
              @input="updateStyle('x', $event)"
              class="number-input"
            />
          </div>
        </div>
        <div class="property-row">
          <label>Y</label>
          <div class="input-with-slider">
            <input
              type="range"
              :value="element.style.y"
              min="0"
              max="2000"
              step="1"
              @input="updateStyle('y', $event)"
              class="slider"
            />
            <input
              type="number"
              :value="element.style.y"
              @input="updateStyle('y', $event)"
              class="number-input"
            />
          </div>
        </div>
      </div>

      <div class="property-section">
        <div class="section-title">大小</div>
        <div class="property-row">
          <label>宽度</label>
          <div class="input-with-slider">
            <input
              type="range"
              :value="element.style.width"
              min="20"
              max="800"
              step="1"
              @input="updateStyle('width', $event)"
              class="slider"
            />
            <input
              type="number"
              :value="element.style.width"
              @input="updateStyle('width', $event)"
              class="number-input"
            />
          </div>
        </div>
        <div class="property-row">
          <label>高度</label>
          <div class="input-with-slider">
            <input
              type="range"
              :value="element.style.height"
              min="20"
              max="800"
              step="1"
              @input="updateStyle('height', $event)"
              class="slider"
            />
            <input
              type="number"
              :value="element.style.height"
              @input="updateStyle('height', $event)"
              class="number-input"
            />
          </div>
        </div>
      </div>

      <div class="property-section">
        <div class="section-title">变换</div>
        <div class="property-row">
          <label>旋转</label>
          <div class="input-with-slider">
            <input
              type="range"
              :value="element.style.rotation"
              min="0"
              max="360"
              step="1"
              @input="updateStyle('rotation', $event)"
              class="slider"
            />
            <input
              type="number"
              :value="element.style.rotation"
              @input="updateStyle('rotation', $event)"
              class="number-input"
            />
          </div>
        </div>
        <div class="property-row">
          <label>透明度</label>
          <div class="input-with-slider">
            <input
              type="range"
              :value="element.style.opacity"
              min="0"
              max="100"
              step="1"
              @input="updateStyle('opacity', $event)"
              class="slider"
            />
            <input
              type="number"
              :value="element.style.opacity"
              @input="updateStyle('opacity', $event)"
              class="number-input"
            />
          </div>
        </div>
      </div>

      <div class="property-section">
        <div class="section-title">交互触发</div>
        <div class="trigger-list">
          <div
            v-for="trigger in element.triggers"
            :key="trigger.type"
            class="trigger-item"
          >
            <span class="trigger-type">{{ triggerLabels[trigger.type] }}</span>
            <span class="trigger-anim">{{ animationLabels[trigger.animation] }}</span>
            <button class="remove-trigger" @click="removeTrigger(trigger.type)">
              ×
            </button>
          </div>
        </div>
        <div class="add-trigger">
          <select v-model="newTriggerType" class="select-input">
            <option value="">添加触发...</option>
            <option v-for="t in availableTriggers" :key="t" :value="t">
              {{ triggerLabels[t as keyof typeof triggerLabels] }}
            </option>
          </select>
          <select v-model="newTriggerAnim" class="select-input" :disabled="!newTriggerType">
            <option value="">选择动画...</option>
            <option v-for="a in animationTypes" :key="a" :value="a">
              {{ animationLabels[a as keyof typeof animationLabels] }}
            </option>
          </select>
          <button
            class="add-btn"
            :disabled="!newTriggerType || !newTriggerAnim"
            @click="addTrigger"
          >
            添加
          </button>
        </div>
      </div>

      <div class="property-section">
        <button class="delete-btn" @click="$emit('delete', element.id)">
          删除元素
        </button>
      </div>
    </div>

    <div v-else class="empty-panel">
      <p>选择一个元素以编辑属性</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PrototypeElement, TriggerType, AnimationType, ElementStyle } from '@/types'

const props = defineProps<{
  element: PrototypeElement | null
}>()

const emit = defineEmits<{
  (e: 'update', id: string, updates: Partial<PrototypeElement>): void
  (e: 'delete', id: string): void
}>()

const newTriggerType = ref('')
const newTriggerAnim = ref('')

const triggerLabels: Record<TriggerType, string> = {
  click: '点击',
  hover: '悬停',
  drag: '拖拽'
}

const animationLabels: Record<AnimationType, string> = {
  scale: '缩放',
  rotate: '旋转',
  translate: '位移',
  fade: '淡入淡出'
}

const animationTypes: AnimationType[] = ['scale', 'rotate', 'translate', 'fade']

const elementTypeLabel = computed(() => {
  if (!props.element) return ''
  const labels: Record<string, string> = {
    button: '按钮',
    card: '卡片',
    modal: '弹窗',
    slider: '滑动条'
  }
  return labels[props.element.type] || props.element.type
})

const availableTriggers = computed(() => {
  if (!props.element) return []
  const existing = props.element.triggers.map((t) => t.type)
  return (['click', 'hover', 'drag'] as TriggerType[]).filter(
    (t) => !existing.includes(t)
  )
})

const updateStyle = (prop: keyof ElementStyle, event: Event) => {
  if (!props.element) return
  const target = event.target as HTMLInputElement
  const value = Number(target.value)
  emit('update', props.element.id, {
    style: { [prop]: value } as Partial<ElementStyle>
  })
}

const updateLabel = (event: Event) => {
  if (!props.element) return
  const target = event.target as HTMLInputElement
  emit('update', props.element.id, { label: target.value })
}

const addTrigger = () => {
  if (!props.element || !newTriggerType.value || !newTriggerAnim.value) return

  const triggers = [
    ...props.element.triggers,
    {
      type: newTriggerType.value as TriggerType,
      animation: newTriggerAnim.value as AnimationType,
      duration: 300,
      easing: 'ease-out',
      targetValue: 1.2
    }
  ]

  emit('update', props.element.id, { triggers })
  newTriggerType.value = ''
  newTriggerAnim.value = ''
}

const removeTrigger = (type: TriggerType) => {
  if (!props.element) return
  const triggers = props.element.triggers.filter((t) => t.type !== type)
  emit('update', props.element.id, { triggers })
}
</script>

<style scoped>
.property-panel {
  width: 280px;
  background: rgba(26, 26, 46, 0.95);
  border-left: 1px solid #33333a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  backdrop-filter: blur(10px);
}

.panel-header {
  height: 50px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #33333a;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.property-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #e94560;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.property-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

.property-row label {
  width: 50px;
  font-size: 12px;
  color: #aaa;
  flex-shrink: 0;
}

.value-text {
  font-size: 13px;
  color: #fff;
}

.input-text {
  flex: 1;
  padding: 6px 10px;
  background: #252538;
  border: 1px solid #33333a;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  transition: border-color 0.2s ease-out;
}

.input-text:focus {
  outline: none;
  border-color: #e94560;
}

.input-with-slider {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #33333a;
  border-radius: 2px;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #e94560;
  cursor: pointer;
  transition: transform 0.2s ease-out;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.number-input {
  width: 60px;
  padding: 4px 8px;
  background: #252538;
  border: 1px solid #33333a;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  text-align: right;
}

.number-input:focus {
  outline: none;
  border-color: #e94560;
}

.trigger-list {
  margin-bottom: 12px;
}

.trigger-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #252538;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 12px;
}

.trigger-type {
  color: #e94560;
  font-weight: 500;
}

.trigger-anim {
  color: #aaa;
  flex: 1;
}

.remove-trigger {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}

.remove-trigger:hover {
  color: #e94560;
}

.add-trigger {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.select-input {
  padding: 6px 10px;
  background: #252538;
  border: 1px solid #33333a;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: #e94560;
}

.select-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-btn {
  padding: 8px;
  background: #e94560;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease-out;
}

.add-btn:hover:not(:disabled) {
  background: #d63850;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: #e94560;
  border: 1px solid #e94560;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.delete-btn:hover {
  background: rgba(233, 69, 96, 0.1);
}

.empty-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 13px;
}

.property-panel.collapsed {
  display: none;
}
</style>
