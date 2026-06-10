<script setup lang="ts">
import { computed } from 'vue'
import type { CoffeeBean, DimensionDiff } from '../types/coffee'
import { FLAVOR_DIMENSIONS } from '../types/coffee'

const props = defineProps<{
  coffees: CoffeeBean[]
  selectedId: string | null
  compareId: string | null
  mode: 'overlay' | 'side-by-side'
}>()

const emit = defineEmits<{
  (e: 'select-compare', id: string | null): void
  (e: 'change-mode', mode: 'overlay' | 'side-by-side'): void
}>()

const selectedCoffee = computed(() =>
  props.coffees.find(c => c.id === props.selectedId) || null
)

const compareCoffee = computed(() =>
  props.coffees.find(c => c.id === props.compareId) || null
)

const availableForCompare = computed(() =>
  props.coffees.filter(c => c.id !== props.selectedId)
)

const dimensionDiffs = computed<DimensionDiff[]>(() => {
  if (!selectedCoffee.value || !compareCoffee.value) return []
  return FLAVOR_DIMENSIONS.map(d => {
    const baseValue = selectedCoffee.value!.flavor[d.key]
    const compareValue = compareCoffee.value!.flavor[d.key]
    const diffPercent = baseValue === 0
      ? (compareValue === 0 ? 0 : 100)
      : Math.round(((compareValue - baseValue) / baseValue) * 100)
    return {
      dimension: d.key,
      label: d.label,
      diffPercent,
      baseValue,
      compareValue
    }
  })
})

const avgDiff = computed(() => {
  if (!dimensionDiffs.value.length) return 0
  const sum = dimensionDiffs.value.reduce((acc, d) => acc + Math.abs(d.diffPercent), 0)
  return Math.round(sum / dimensionDiffs.value.length)
})
</script>

<template>
  <aside class="comparison-panel">
    <div class="panel-title-row">
      <span class="panel-icon">⚖️</span>
      <span class="panel-title">风味对比</span>
    </div>

    <div class="control-section">
      <label class="control-label">对比模式</label>
      <select
        :value="mode"
        class="mode-select"
        @change="emit('change-mode', ($event.target as HTMLSelectElement).value as any)"
      >
        <option value="overlay">叠加模式</option>
        <option value="side-by-side">并排模式</option>
      </select>
    </div>

    <div class="control-section">
      <label class="control-label">选择对比咖啡豆</label>
      <select
        :value="compareId || ''"
        class="coffee-select"
        @change="emit('select-compare', ($event.target as HTMLSelectElement).value || null)"
      >
        <option value="">-- 不对比 --</option>
        <option v-for="c in availableForCompare" :key="c.id" :value="c.id">
          {{ c.name }} ({{ c.origin }})
        </option>
      </select>
    </div>

    <div v-if="compareCoffee" class="compare-info">
      <div class="compare-header">
        <div class="compare-dot" style="background: #c88242" />
        <span class="compare-name">{{ selectedCoffee?.name || '—' }}</span>
      </div>
      <div class="compare-header">
        <div class="compare-dot" style="background: #ff7f50" />
        <span class="compare-name">{{ compareCoffee.name }}</span>
      </div>
    </div>

    <Transition name="diff">
      <div v-if="dimensionDiffs.length" class="diff-summary">
        <div class="diff-title">
          差异摘要
          <span class="avg-diff">平均 ±{{ avgDiff }}%</span>
        </div>
        <div class="diff-list">
          <div
            v-for="d in dimensionDiffs"
            :key="d.dimension"
            class="diff-item"
          >
            <span class="diff-label">{{ d.label }}</span>
            <div class="diff-bar-wrapper">
              <div class="diff-bar-track" />
              <div
                class="diff-bar-fill"
                :class="{ positive: d.diffPercent > 0, negative: d.diffPercent < 0 }"
                :style="{
                  width: `${Math.min(100, Math.abs(d.diffPercent))}%`,
                  marginLeft: d.diffPercent < 0 ? `${100 - Math.min(100, Math.abs(d.diffPercent))}%` : '50%'
                }"
              />
              <div class="diff-bar-center" />
            </div>
            <span
              class="diff-value"
              :class="{ positive: d.diffPercent > 0, negative: d.diffPercent < 0 }"
            >
              {{ d.diffPercent > 0 ? '+' : '' }}{{ d.diffPercent }}%
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
.comparison-panel {
  width: 220px;
  background: rgba(30, 30, 46, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(200, 130, 66, 0.15);
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(200, 130, 66, 0.2);
}

.panel-icon {
  font-size: 16px;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: #f5efe6;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  font-size: 11px;
  color: #a89888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mode-select,
.coffee-select {
  width: 100%;
  background: #2b2b2b;
  border: 1px solid #4a4a4a;
  border-radius: 6px;
  padding: 6px 10px;
  color: #f5efe6;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease-out;
}

.mode-select:hover,
.coffee-select:hover,
.mode-select:focus,
.coffee-select:focus {
  border-color: #c88242;
}

.compare-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.compare-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compare-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.compare-name {
  font-size: 12px;
  color: #d8c8b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.diff-summary {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diff-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #f5efe6;
}

.avg-diff {
  font-size: 11px;
  font-weight: 700;
  color: #a0d468;
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.diff-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.diff-label {
  font-size: 10px;
  color: #a89888;
  min-width: 28px;
}

.diff-bar-wrapper {
  flex: 1;
  height: 6px;
  position: relative;
}

.diff-bar-track {
  position: absolute;
  inset: 0;
  background: #3a2e24;
  border-radius: 3px;
}

.diff-bar-center {
  position: absolute;
  left: 50%;
  top: -1px;
  bottom: -1px;
  width: 1px;
  background: #644a38;
}

.diff-bar-fill {
  position: relative;
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease-out, margin-left 0.3s ease-out;
  z-index: 1;
}

.diff-bar-fill.positive {
  background: #a0d468;
}

.diff-bar-fill.negative {
  background: #c44d58;
}

.diff-value {
  font-size: 10px;
  font-weight: 700;
  color: #a0d468;
  min-width: 36px;
  text-align: right;
}

.diff-value.positive {
  color: #a0d468;
}

.diff-value.negative {
  color: #e88a93;
}

.diff-enter-active,
.diff-leave-active {
  transition: all 0.3s ease-out;
}

.diff-enter-from,
.diff-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1024px) {
  .comparison-panel {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px 16px;
    padding: 12px 16px;
  }

  .panel-title-row {
    width: 100%;
    padding-bottom: 8px;
    margin-bottom: 0;
  }

  .control-section {
    flex: 1;
    min-width: 140px;
  }

  .compare-info {
    min-width: 160px;
  }

  .diff-summary {
    width: 100%;
  }
}
</style>
