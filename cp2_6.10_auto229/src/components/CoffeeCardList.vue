<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { CoffeeBean } from '../types/coffee'
import { FLAVOR_DIMENSIONS } from '../types/coffee'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps<{
  coffees: CoffeeBean[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'add', coffee: CoffeeBean): void
  (e: 'bulk-add', coffees: CoffeeBean[]): void
}>()

const importPanelOpen = ref(false)
const jsonInput = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const hoveredCardId = ref<string | null>(null)

function getTopFlavors(coffee: CoffeeBean) {
  return FLAVOR_DIMENSIONS
    .map(d => ({ key: d.key, label: d.label, value: coffee.flavor[d.key], color: d.color }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
}

function getGradientColor(coffee: CoffeeBean): string {
  if (coffee.color) return coffee.color
  const top = getTopFlavors(coffee)
  return top[0]?.color || '#c88242'
}

function drawMiniRadar(canvas: HTMLCanvasElement, coffee: CoffeeBean) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const size = 80
  const cx = size / 2
  const cy = size / 2
  const r = 30
  const count = 6
  const angleStep = (Math.PI * 2) / count

  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = 'rgba(100, 74, 56, 0.3)'
  ctx.lineWidth = 0.5
  for (let level = 2; level <= 10; level += 2) {
    const rad = (r * level) / 10
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep - Math.PI / 2
      const x = cx + Math.cos(angle) * rad
      const y = cy + Math.sin(angle) * rad
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
    ctx.stroke()
  }

  const grad = ctx.createLinearGradient(0, 0, size, size)
  FLAVOR_DIMENSIONS.forEach((d, i) => {
    grad.addColorStop(i / (count - 1), d.color)
  })

  ctx.beginPath()
  FLAVOR_DIMENSIONS.forEach((d, i) => {
    const angle = i * angleStep - Math.PI / 2
    const value = coffee.flavor[d.key]
    const rad = (r * value) / 10
    const x = cx + Math.cos(angle) * rad
    const y = cy + Math.sin(angle) * rad
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(200, 130, 66, 0.3)'
  ctx.fill()
  ctx.strokeStyle = '#c88242'
  ctx.lineWidth = 1.5
  ctx.stroke()

  FLAVOR_DIMENSIONS.forEach((d, i) => {
    const angle = i * angleStep - Math.PI / 2
    const value = coffee.flavor[d.key]
    const rad = (r * value) / 10
    const x = cx + Math.cos(angle) * rad
    const y = cy + Math.sin(angle) * rad
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, Math.PI * 2)
    ctx.fillStyle = d.color
    ctx.fill()
  })
}

function handleCardHover(id: string | null, canvasEl?: HTMLCanvasElement, coffee?: CoffeeBean) {
  hoveredCardId.value = id
  if (id && canvasEl && coffee) {
    requestAnimationFrame(() => drawMiniRadar(canvasEl, coffee))
  }
}

function parseJson() {
  try {
    const data = JSON.parse(jsonInput.value)
    const beans = Array.isArray(data) ? data : [data]
    const parsed: CoffeeBean[] = beans.map((b: any) => ({
      id: uuidv4(),
      name: b.name || '未命名',
      origin: b.origin || '未知产地',
      roastLevel: b.roastLevel || 'Medium',
      process: b.process || 'Washed',
      flavor: {
        floral: Math.min(10, Math.max(0, Number(b.flavor?.floral ?? 5))),
        fruit: Math.min(10, Math.max(0, Number(b.flavor?.fruit ?? 5))),
        chocolate: Math.min(10, Math.max(0, Number(b.flavor?.chocolate ?? 5))),
        nutty: Math.min(10, Math.max(0, Number(b.flavor?.nutty ?? 5))),
        caramel: Math.min(10, Math.max(0, Number(b.flavor?.caramel ?? 5))),
        spice: Math.min(10, Math.max(0, Number(b.flavor?.spice ?? 5)))
      },
      notes: b.notes || {},
      color: b.color
    }))
    emit('bulk-add', parsed)
    jsonInput.value = ''
    importPanelOpen.value = false
  } catch (e) {
    alert('JSON 格式解析失败，请检查输入')
  }
}

function parseCsv(text: string) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const beans: CoffeeBean[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = values[idx] || '' })
    beans.push({
      id: uuidv4(),
      name: obj.name || '未命名',
      origin: obj.origin || '未知产地',
      roastLevel: (obj.roastLevel as any) || 'Medium',
      process: (obj.process as any) || 'Washed',
      flavor: {
        floral: Math.min(10, Math.max(0, Number(obj.floral ?? 5))),
        fruit: Math.min(10, Math.max(0, Number(obj.fruit ?? 5))),
        chocolate: Math.min(10, Math.max(0, Number(obj.chocolate ?? 5))),
        nutty: Math.min(10, Math.max(0, Number(obj.nutty ?? 5))),
        caramel: Math.min(10, Math.max(0, Number(obj.caramel ?? 5))),
        spice: Math.min(10, Math.max(0, Number(obj.spice ?? 5)))
      }
    })
  }
  return beans
}

function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    if (file.name.endsWith('.json')) {
      jsonInput.value = text
    } else if (file.name.endsWith('.csv')) {
      const beans = parseCsv(text)
      if (beans.length) {
        emit('bulk-add', beans)
        importPanelOpen.value = false
      }
    }
  }
  reader.readAsText(file)
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    if (file.name.endsWith('.json')) {
      jsonInput.value = text
    } else if (file.name.endsWith('.csv')) {
      const beans = parseCsv(text)
      if (beans.length) {
        emit('bulk-add', beans)
        importPanelOpen.value = false
      }
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="card-list-wrapper">
    <div class="card-list" @click.stop>
      <button
        class="add-card-btn"
        @click="importPanelOpen = !importPanelOpen"
        title="批量导入"
      >
        <span class="plus-icon">+</span>
      </button>

      <div
        v-for="coffee in coffees"
        :key="coffee.id"
        class="coffee-card"
        :class="{ selected: selectedId === coffee.id, hovered: hoveredCardId === coffee.id }"
        :style="{
          '--card-gradient': `linear-gradient(135deg, ${getGradientColor(coffee)}44, #2b2b2b 60%)`
        }"
        @click="emit('select', coffee.id)"
        @mouseenter="(e) => handleCardHover(coffee.id, (e.currentTarget as HTMLElement).querySelector('canvas') as HTMLCanvasElement, coffee)"
        @mouseleave="handleCardHover(null)"
      >
        <div class="card-bg" />
        <div class="card-content">
          <div class="card-name">{{ coffee.name }}</div>
          <div class="card-meta">{{ coffee.origin }}</div>
          <div class="card-tags">
            <span class="tag">{{ coffee.roastLevel }}</span>
            <span class="tag">{{ coffee.process }}</span>
          </div>
          <div class="card-flavors">
            <span
              v-for="f in getTopFlavors(coffee)"
              :key="f.key"
              class="flavor-tag"
              :style="{ color: f.color }"
            >
              {{ f.label }} {{ f.value }}
            </span>
          </div>
        </div>
        <Transition name="mini-radar">
          <canvas
            v-show="hoveredCardId === coffee.id"
            class="mini-radar"
            width="80"
            height="80"
          />
        </Transition>
      </div>
    </div>

    <Transition name="slide-up">
      <div
        v-if="importPanelOpen"
        class="import-panel"
        @click.stop
        @dragover.prevent
        @drop="handleDrop"
      >
        <div class="import-header">
          <span class="import-title">批量导入咖啡豆</span>
          <button class="import-close" @click="importPanelOpen = false">×</button>
        </div>
        <div class="import-body">
          <div class="import-tabs">
            <span class="tab-label">粘贴 JSON：</span>
            <textarea
              v-model="jsonInput"
              class="json-input"
              rows="4"
              placeholder='[{"name":"埃塞俄比亚耶加雪菲","origin":"埃塞俄比亚","roastLevel":"Light","process":"Washed","flavor":{"floral":8,"fruit":9,"chocolate":3,"nutty":2,"caramel":4,"spice":2}}]'
            />
          </div>
          <div class="import-tabs">
            <span class="tab-label">或拖入/选择 JSON/CSV 文件：</span>
            <input
              ref="fileInputRef"
              type="file"
              accept=".json,.csv"
              class="file-input"
              @change="handleFile"
            />
          </div>
          <div class="import-actions">
            <button class="import-btn" @click="parseJson">解析并导入</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.card-list-wrapper {
  position: relative;
  width: 100%;
}

.card-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 16px 20px 16px 12px;
  align-items: flex-start;
  min-height: 130px;
}

.add-card-btn {
  flex-shrink: 0;
  width: 120px;
  height: 90px;
  background: #2b2b2b;
  border: 1px dashed #4a4a4a;
  border-radius: 8px;
  color: #644a38;
  font-size: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-out;
}

.add-card-btn:hover {
  border-color: #c88242;
  color: #c88242;
  transform: translateY(-2px);
}

.plus-icon {
  line-height: 1;
}

.coffee-card {
  flex-shrink: 0;
  width: 120px;
  height: 90px;
  background: #2b2b2b;
  border: 1px solid #4a4a4a;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease-out;
}

.coffee-card:hover {
  transform: scale(1.08) translateY(-3px);
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  border-color: #c88242;
}

.coffee-card.selected {
  border-color: #c88242;
  box-shadow: 0 0 0 2px rgba(200, 130, 66, 0.4);
}

.card-bg {
  position: absolute;
  inset: 0;
  background: var(--card-gradient);
  opacity: 0.6;
  pointer-events: none;
}

.card-content {
  position: relative;
  padding: 8px 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-name {
  font-size: 13px;
  font-weight: 700;
  color: #f5efe6;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  font-size: 10px;
  color: #a89888;
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tag {
  font-size: 9px;
  padding: 1px 5px;
  background: rgba(200, 130, 66, 0.2);
  color: #c88242;
  border-radius: 3px;
}

.card-flavors {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: auto;
}

.flavor-tag {
  font-size: 9px;
  font-weight: 600;
}

.mini-radar {
  position: absolute;
  top: 5px;
  right: 5px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.mini-radar-enter-active,
.mini-radar-leave-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.mini-radar-enter-from,
.mini-radar-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.import-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 12px;
  right: 20px;
  background: #2b2b2b;
  border: 1px solid #4a4a4a;
  border-radius: 12px;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: 50;
}

.import-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(200, 130, 66, 0.12);
  border-bottom: 1px solid #4a4a4a;
}

.import-title {
  font-weight: 600;
  font-size: 13px;
  color: #f5efe6;
}

.import-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #a89888;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}

.import-close:hover {
  color: #f5efe6;
}

.import-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tab-label {
  display: block;
  font-size: 12px;
  color: #a89888;
  margin-bottom: 6px;
}

.json-input {
  width: 100%;
  background: #1e1814;
  border: 1px solid #4a4a4a;
  border-radius: 6px;
  padding: 8px 10px;
  color: #f5efe6;
  font-size: 11px;
  font-family: 'SF Mono', Monaco, monospace;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}

.json-input:focus {
  border-color: #c88242;
}

.file-input {
  font-size: 11px;
  color: #a89888;
}

.file-input::file-selector-button {
  background: #3a2e24;
  color: #c88242;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  padding: 4px 10px;
  margin-right: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.file-input::file-selector-button:hover {
  background: #4a3e34;
}

.import-actions {
  display: flex;
  justify-content: flex-end;
}

.import-btn {
  padding: 6px 18px;
  background: #c88242;
  color: #fff8e7;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.import-btn:hover {
  background: #b87232;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
