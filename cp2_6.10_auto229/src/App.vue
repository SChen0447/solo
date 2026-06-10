<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CoffeeBean, FlavorDimension } from './types/coffee'
import { v4 as uuidv4 } from 'uuid'
import FlavorWheel from './components/FlavorWheel.vue'
import CoffeeCardList from './components/CoffeeCardList.vue'
import ComparisonPanel from './components/ComparisonPanel.vue'

const sampleCoffees: CoffeeBean[] = [
  {
    id: uuidv4(),
    name: '埃塞俄比亚 耶加雪菲',
    origin: '埃塞俄比亚',
    roastLevel: 'Light',
    process: 'Washed',
    flavor: { floral: 8, fruit: 9, chocolate: 3, nutty: 2, caramel: 4, spice: 2 },
    notes: { floral: '茉莉花香', fruit: '柠檬、蓝莓' },
    color: '#e8a0bf'
  },
  {
    id: uuidv4(),
    name: '哥伦比亚 慧兰',
    origin: '哥伦比亚',
    roastLevel: 'Medium',
    process: 'Washed',
    flavor: { floral: 4, fruit: 6, chocolate: 7, nutty: 6, caramel: 7, spice: 3 },
    notes: { chocolate: '黑巧克力', caramel: '红糖' },
    color: '#8b5a2b'
  },
  {
    id: uuidv4(),
    name: '印尼 曼特宁',
    origin: '印度尼西亚',
    roastLevel: 'Medium-Dark',
    process: 'Natural',
    flavor: { floral: 2, fruit: 3, chocolate: 8, nutty: 8, caramel: 6, spice: 5 },
    notes: { nutty: '核桃、雪松', spice: '黑胡椒' },
    color: '#c4956a'
  },
  {
    id: uuidv4(),
    name: '肯尼亚 AA',
    origin: '肯尼亚',
    roastLevel: 'Light',
    process: 'Washed',
    flavor: { floral: 6, fruit: 9, chocolate: 4, nutty: 3, caramel: 5, spice: 4 },
    notes: { fruit: '黑醋栗、番茄' },
    color: '#ff6b6b'
  },
  {
    id: uuidv4(),
    name: '巴西 喜拉多',
    origin: '巴西',
    roastLevel: 'Medium',
    process: 'Natural',
    flavor: { floral: 3, fruit: 5, chocolate: 7, nutty: 7, caramel: 8, spice: 3 },
    notes: { nutty: '花生', caramel: '牛奶焦糖' },
    color: '#d4a574'
  }
]

const coffees = ref<CoffeeBean[]>(sampleCoffees)
const selectedId = ref<string | null>(sampleCoffees[0]?.id || null)
const compareId = ref<string | null>(null)
const compareMode = ref<'overlay' | 'side-by-side'>('overlay')

const selectedCoffee = computed(() =>
  coffees.value.find(c => c.id === selectedId.value) || null
)

const compareCoffee = computed(() =>
  coffees.value.find(c => c.id === compareId.value) || null
)

const effectiveCompareCoffee = computed(() =>
  compareMode.value === 'overlay' ? compareCoffee.value : null
)

function selectCoffee(id: string) {
  selectedId.value = id
}

function selectCompare(id: string | null) {
  compareId.value = id
}

function changeMode(mode: 'overlay' | 'side-by-side') {
  compareMode.value = mode
}

function updateSegment(data: { dimension: FlavorDimension; intensity: number; note: string }) {
  const coffee = coffees.value.find(c => c.id === selectedId.value)
  if (!coffee) return
  coffee.flavor[data.dimension] = data.intensity
  if (!coffee.notes) coffee.notes = {}
  if (data.note) coffee.notes[data.dimension] = data.note
  else delete coffee.notes[data.dimension]
  coffees.value = [...coffees.value]
}

function bulkAdd(newCoffees: CoffeeBean[]) {
  coffees.value = [...coffees.value, ...newCoffees]
  if (!selectedId.value && newCoffees.length) {
    selectedId.value = newCoffees[0].id
  }
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">
        <span class="title-icon">☕</span>
        Coffee Flavor Wheel
      </h1>
      <p class="app-subtitle">探索咖啡豆的风味光谱 · 记录与对比你的品鉴体验</p>
    </header>

    <main class="main-layout">
      <div class="left-panel desktop-only">
        <ComparisonPanel
          :coffees="coffees"
          :selected-id="selectedId"
          :compare-id="compareId"
          :mode="compareMode"
          @select-compare="selectCompare"
          @change-mode="changeMode"
        />
      </div>

      <div class="center-area">
        <div class="wheel-wrapper">
          <FlavorWheel
            :coffee="selectedCoffee"
            :compare-coffee="effectiveCompareCoffee"
            @segment-update="updateSegment"
          />
        </div>

        <div class="mobile-only mobile-compare">
          <ComparisonPanel
            :coffees="coffees"
            :selected-id="selectedId"
            :compare-id="compareId"
            :mode="compareMode"
            @select-compare="selectCompare"
            @change-mode="changeMode"
          />
        </div>
      </div>
    </main>

    <footer class="card-list-area">
      <CoffeeCardList
        :coffees="coffees"
        :selected-id="selectedId"
        @select="selectCoffee"
        @bulk-add="bulkAdd"
      />
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1814;
  overflow: hidden;
}

.app-header {
  flex-shrink: 0;
  padding: 14px 24px 10px;
  text-align: center;
  border-bottom: 1px solid rgba(200, 130, 66, 0.15);
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  color: #f5efe6;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.5px;
}

.title-icon {
  font-size: 22px;
}

.app-subtitle {
  font-size: 12px;
  color: #8b7a6a;
  margin-top: 4px;
}

.main-layout {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}

.left-panel {
  flex-shrink: 0;
  padding: 20px 0 20px 20px;
  display: flex;
  flex-direction: column;
}

.center-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  min-width: 0;
  position: relative;
}

.wheel-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-compare {
  position: absolute;
  bottom: 8px;
  left: 12px;
  right: 12px;
}

.card-list-area {
  flex-shrink: 0;
  border-top: 1px solid rgba(200, 130, 66, 0.1);
  background: rgba(0, 0, 0, 0.15);
}

.desktop-only {
  display: block;
}

.mobile-only {
  display: none;
}

@media (max-width: 1024px) {
  .desktop-only {
    display: none;
  }

  .mobile-only {
    display: block;
  }

  .app-header {
    padding: 10px 16px 8px;
  }

  .app-title {
    font-size: 17px;
  }

  .app-subtitle {
    font-size: 11px;
  }

  .center-area {
    padding: 4px;
  }
}
</style>
