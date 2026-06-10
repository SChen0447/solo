import { SceneManager } from './scene'
import { UIController } from './ui'
import { EnvironmentParams } from './plant'

function initApp(): void {
  const canvasContainer = document.getElementById('canvas-container')
  const controlsContainer = document.getElementById('controls')

  if (!canvasContainer || !controlsContainer) {
    console.error('缺少必要的 DOM 元素')
    return
  }

  const sceneManager = new SceneManager(canvasContainer)
  const plant = sceneManager.getPlant()

  const uiController = new UIController(
    controlsContainer,
    (params: Partial<EnvironmentParams>) => {
      plant.setEnvironmentParams(params)
    }
  )

  sceneManager.setStatsCallback((stats) => {
    uiController.updateStats(stats)
  })

  const initialParams = uiController.getValues()
  plant.setEnvironmentParams(initialParams)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
