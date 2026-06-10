<script setup lang="ts">
import { ref, provide } from 'vue'
import type { ColorItem, TemplateType } from './types'
import PaletteCreator from './components/PaletteCreator.vue'
import DemoViewer from './components/DemoViewer.vue'
import { generateDefaultPalette } from './utils/colorUtils'

const demoViewerRef = ref<InstanceType<typeof DemoViewer> | null>(null)

const colors = ref<ColorItem[]>(generateDefaultPalette())
const template = ref<TemplateType>('blog')
const schemeName = ref('')
const isFullscreen = ref(false)
const isMobile = ref(window.innerWidth < 768)

window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth < 768
})

const handleColorsUpdate = (newColors: ColorItem[]) => {
  colors.value = newColors
}

const handleTemplateChange = (t: TemplateType) => {
  template.value = t
}

const handleFullscreenToggle = (val: boolean) => {
  isFullscreen.value = val
}

const handleSchemeNameUpdate = (name: string) => {
  schemeName.value = name
}

const handleDownload = () => {
  demoViewerRef.value?.downloadCanvas()
}

provide('paletteContext', {
  colors,
  template,
  schemeName,
  isFullscreen,
  isMobile
})
</script>

<template>
  <div class="app-container" :class="{ 'is-fullscreen': isFullscreen, 'is-mobile': isMobile }">
    <aside
      v-show="!isFullscreen"
      class="sidebar"
      :class="{ 'sidebar-top': isMobile }"
    >
      <PaletteCreator
        :colors="colors"
        :scheme-name="schemeName"
        @update:colors="handleColorsUpdate"
        @update:schemeName="handleSchemeNameUpdate"
        @download="handleDownload"
      />
    </aside>
    <main class="main-area">
      <DemoViewer
        ref="demoViewerRef"
        :colors="colors"
        :template="template"
        :scheme-name="schemeName"
        :is-fullscreen="isFullscreen"
        :is-mobile="isMobile"
        @update:template="handleTemplateChange"
        @update:isFullscreen="handleFullscreenToggle"
        @update:colors="handleColorsUpdate"
      />
    </main>
    <div v-if="isFullscreen" class="fullscreen-floating-picker">
      <PaletteCreator
        :colors="colors"
        :scheme-name="schemeName"
        :floating="true"
        @update:colors="handleColorsUpdate"
        @update:schemeName="handleSchemeNameUpdate"
      />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  min-width: 280px;
  background: #fafafa;
  border-right: 2px solid #e0e0e0;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 10;
}

.sidebar.sidebar-top {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 60px;
  min-width: unset;
  border-right: none;
  border-bottom: 2px solid #e0e0e0;
  overflow-y: hidden;
  overflow-x: auto;
}

.main-area {
  flex: 1;
  background: #ffffff;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.app-container.is-mobile .main-area {
  padding-top: 60px;
}

.app-container.is-fullscreen .main-area {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  box-shadow: none;
}

.fullscreen-floating-picker {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 200px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  z-index: 101;
  padding: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
</style>
