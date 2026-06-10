import { createScene } from './sceneSetup'
import { createControls } from './materialControls'
import type { MaterialPreset } from './sceneSetup'

function initApp(): void {
  const canvasWrapper = document.getElementById('canvas-wrapper')
  const panelContent = document.getElementById('panel-content')
  const fpsElement = document.getElementById('fps')
  const toggleBtn = document.getElementById('toggle-panel')
  const controlsPanel = document.getElementById('controls-panel')

  if (!canvasWrapper || !panelContent) {
    console.error('Required DOM elements not found')
    return
  }

  const sceneAPI = createScene(canvasWrapper)
  const controlsAPI = createControls(panelContent, sceneAPI)

  controlsAPI.init()

  controlsAPI.onMaterialChange((presetId: string) => {
    sceneAPI.applyMaterialPreset(presetId)
    controlsAPI.updateActiveMaterial(presetId)
    const preset = sceneAPI.materialPresets.find((p: MaterialPreset) => p.id === presetId)
    if (preset) {
      controlsAPI.syncSlidersFromMaterial(preset)
    }
  })

  controlsAPI.onParamsChange((params) => {
    sceneAPI.updateMaterialParams(params)
  })

  controlsAPI.onLightingChange((presetId: string) => {
    sceneAPI.setLightingPreset(presetId)
    controlsAPI.updateActiveLighting(presetId)
  })

  if (toggleBtn && controlsPanel) {
    toggleBtn.addEventListener('click', () => {
      controlsPanel.classList.toggle('open')
    })
  }

  window.addEventListener('resize', () => {
    sceneAPI.resize()
  })

  const clock = {
    lastTime: performance.now(),
    fpsFrames: 0,
    fpsLastUpdate: performance.now()
  }

  function animate(): void {
    requestAnimationFrame(animate)
    const now = performance.now()
    const delta = (now - clock.lastTime) / 1000
    clock.lastTime = now

    sceneAPI.tick(delta)

    clock.fpsFrames++
    if (now - clock.fpsLastUpdate >= 500) {
      const fps = Math.round((clock.fpsFrames * 1000) / (now - clock.fpsLastUpdate))
      if (fpsElement) {
        fpsElement.textContent = `FPS: ${fps}`
      }
      clock.fpsFrames = 0
      clock.fpsLastUpdate = now
    }
  }

  animate()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
