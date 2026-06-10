import type { MaterialPreset, LightingPreset, MaterialParams, SceneAPI } from './sceneSetup'

export interface ControlsAPI {
  init: () => void
  onMaterialChange: (callback: (presetId: string) => void) => void
  onParamsChange: (callback: (params: MaterialParams) => void) => void
  onLightingChange: (callback: (presetId: string) => void) => void
  updateActiveMaterial: (presetId: string) => void
  updateActiveLighting: (presetId: string) => void
  syncSlidersFromMaterial: (preset: MaterialPreset) => void
}

interface SliderConfig {
  key: keyof MaterialParams
  label: string
  min: number
  max: number
  step: number
  format?: (v: number) => string
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'roughness', label: '粗糙度', min: 0, max: 1, step: 0.01, format: (v) => v.toFixed(2) },
  { key: 'metalness', label: '金属度', min: 0, max: 1, step: 0.01, format: (v) => v.toFixed(2) },
  { key: 'clearcoat', label: '清漆强度', min: 0, max: 1, step: 0.01, format: (v) => v.toFixed(2) },
  { key: 'clearcoatRoughness', label: '清漆粗糙度', min: 0, max: 1, step: 0.01, format: (v) => v.toFixed(2) },
  { key: 'aoMapIntensity', label: '环境光遮蔽', min: 0, max: 1, step: 0.01, format: (v) => v.toFixed(2) }
]

export function createControls(container: HTMLElement, sceneAPI: SceneAPI): ControlsAPI {
  let materialChangeCallback: ((presetId: string) => void) | null = null
  let paramsChangeCallback: ((params: MaterialParams) => void) | null = null
  let lightingChangeCallback: ((presetId: string) => void) | null = null

  const sliderElements = new Map<string, { input: HTMLInputElement; value: HTMLSpanElement }>()
  const colorInput: { input: HTMLInputElement | null } = { input: null }
  const materialThumbElements = new Map<string, HTMLDivElement>()
  const lightingBtnElements = new Map<string, HTMLButtonElement>()

  function createMaterialThumbnails(presets: MaterialPreset[]): HTMLDivElement {
    const section = document.createElement('div')
    section.className = 'section'

    const title = document.createElement('div')
    title.className = 'section-title'
    title.textContent = '材质预设'
    section.appendChild(title)

    const grid = document.createElement('div')
    grid.className = 'material-grid'

    presets.forEach((preset, index) => {
      const thumb = document.createElement('div')
      thumb.className = 'material-thumb'
      thumb.style.animationDelay = `${index * 0.05}s`
      thumb.dataset.materialId = preset.id
      thumb.title = preset.name

      const preview = document.createElement('div')
      preview.className = 'material-thumb-preview'
      preview.style.background = `radial-gradient(circle at 30% 30%, ${lightenColor(preset.color, 0.3)}, ${preset.color} 60%, ${darkenColor(preset.color, 0.3)})`
      thumb.appendChild(preview)

      const label = document.createElement('div')
      label.className = 'material-thumb-label'
      label.textContent = preset.name
      thumb.appendChild(label)

      thumb.addEventListener('click', () => {
        if (materialChangeCallback) {
          materialChangeCallback(preset.id)
        }
      })

      materialThumbElements.set(preset.id, thumb)
      grid.appendChild(thumb)
    })

    section.appendChild(grid)
    return section
  }

  function createColorPicker(presets: MaterialPreset[]): HTMLDivElement {
    const section = document.createElement('div')
    section.className = 'section'

    const title = document.createElement('div')
    title.className = 'section-title'
    title.textContent = '基础颜色'
    section.appendChild(title)

    const group = document.createElement('div')
    group.className = 'control-group'

    const labelRow = document.createElement('div')
    labelRow.className = 'control-label'
    const labelText = document.createElement('span')
    labelText.textContent = '材质颜色'
    labelRow.appendChild(labelText)
    group.appendChild(labelRow)

    const wrapper = document.createElement('div')
    wrapper.className = 'color-picker-wrapper'

    const input = document.createElement('input')
    input.type = 'color'
    input.value = presets[0]?.color ?? '#ffffff'
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement
      if (paramsChangeCallback) {
        paramsChangeCallback({ color: target.value })
      }
    })
    colorInput.input = input
    wrapper.appendChild(input)
    group.appendChild(wrapper)

    section.appendChild(group)
    return section
  }

  function createSliders(initialPreset: MaterialPreset): HTMLDivElement {
    const section = document.createElement('div')
    section.className = 'section'

    const title = document.createElement('div')
    title.className = 'section-title'
    title.textContent = '材质参数'
    section.appendChild(title)

    SLIDER_CONFIGS.forEach((config) => {
      const group = document.createElement('div')
      group.className = 'control-group'

      const labelRow = document.createElement('div')
      labelRow.className = 'control-label'
      const labelText = document.createElement('span')
      labelText.textContent = config.label
      labelRow.appendChild(labelText)

      const valueSpan = document.createElement('span')
      valueSpan.className = 'control-value'
      const initialValue = (initialPreset[config.key as keyof MaterialPreset] as number) ?? 0
      valueSpan.textContent = config.format ? config.format(initialValue) : String(initialValue)
      labelRow.appendChild(valueSpan)
      group.appendChild(labelRow)

      const wrapper = document.createElement('div')
      wrapper.className = 'slider-wrapper'

      const input = document.createElement('input')
      input.type = 'range'
      input.min = String(config.min)
      input.max = String(config.max)
      input.step = String(config.step)
      input.value = String(initialValue)

      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement
        const value = parseFloat(target.value)
        valueSpan.textContent = config.format ? config.format(value) : String(value)
        if (paramsChangeCallback) {
          paramsChangeCallback({ [config.key]: value } as MaterialParams)
        }
      })

      wrapper.appendChild(input)
      group.appendChild(wrapper)
      section.appendChild(group)

      sliderElements.set(config.key, { input, value: valueSpan })
    })

    return section
  }

  function createLightingPresets(presets: LightingPreset[]): HTMLDivElement {
    const section = document.createElement('div')
    section.className = 'section'

    const title = document.createElement('div')
    title.className = 'section-title'
    title.textContent = '灯光环境'
    section.appendChild(title)

    const buttons = document.createElement('div')
    buttons.className = 'lighting-buttons'

    presets.forEach((preset) => {
      const btn = document.createElement('button')
      btn.className = 'lighting-btn'
      btn.dataset.lightingId = preset.id

      const icon = document.createElement('div')
      icon.className = 'lighting-icon'
      icon.style.background = `linear-gradient(135deg, ${preset.ambientColor}, ${preset.directionalColor})`
      icon.textContent = preset.icon
      btn.appendChild(icon)

      const info = document.createElement('div')
      info.className = 'lighting-info'
      const name = document.createElement('span')
      name.className = 'lighting-name'
      name.textContent = preset.name
      const desc = document.createElement('span')
      desc.className = 'lighting-desc'
      desc.textContent = preset.description
      info.appendChild(name)
      info.appendChild(desc)
      btn.appendChild(info)

      btn.addEventListener('click', () => {
        if (lightingChangeCallback) {
          lightingChangeCallback(preset.id)
        }
      })

      lightingBtnElements.set(preset.id, btn)
      buttons.appendChild(btn)
    })

    section.appendChild(buttons)
    return section
  }

  function lightenColor(hex: string, amount: number): string {
    const { r, g, b } = hexToRgb(hex)
    const nr = Math.min(255, Math.round(r + (255 - r) * amount))
    const ng = Math.min(255, Math.round(g + (255 - g) * amount))
    const nb = Math.min(255, Math.round(b + (255 - b) * amount))
    return rgbToHex(nr, ng, nb)
  }

  function darkenColor(hex: string, amount: number): string {
    const { r, g, b } = hexToRgb(hex)
    const nr = Math.max(0, Math.round(r * (1 - amount)))
    const ng = Math.max(0, Math.round(g * (1 - amount)))
    const nb = Math.max(0, Math.round(b * (1 - amount)))
    return rgbToHex(nr, ng, nb)
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 }
  }

  function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
  }

  const api: ControlsAPI = {
    init: () => {
      container.innerHTML = ''

      const thumbs = createMaterialThumbnails(sceneAPI.materialPresets)
      container.appendChild(thumbs)

      const colorSection = createColorPicker(sceneAPI.materialPresets)
      container.appendChild(colorSection)

      const initialPreset = sceneAPI.materialPresets[0]
      const sliders = createSliders(initialPreset)
      container.appendChild(sliders)

      const lighting = createLightingPresets(sceneAPI.lightingPresets)
      container.appendChild(lighting)

      api.updateActiveMaterial(sceneAPI.currentMaterialId)
      api.updateActiveLighting(sceneAPI.currentLightingId)
    },
    onMaterialChange: (cb) => {
      materialChangeCallback = cb
    },
    onParamsChange: (cb) => {
      paramsChangeCallback = cb
    },
    onLightingChange: (cb) => {
      lightingChangeCallback = cb
    },
    updateActiveMaterial: (presetId) => {
      materialThumbElements.forEach((el, id) => {
        el.classList.toggle('active', id === presetId)
      })
    },
    updateActiveLighting: (presetId) => {
      lightingBtnElements.forEach((el, id) => {
        el.classList.toggle('active', id === presetId)
      })
    },
    syncSlidersFromMaterial: (preset) => {
      if (colorInput.input) {
        colorInput.input.value = preset.color
      }
      SLIDER_CONFIGS.forEach((config) => {
        const elements = sliderElements.get(config.key)
        if (elements) {
          const value = (preset[config.key as keyof MaterialPreset] as number) ?? 0
          elements.input.value = String(value)
          elements.value.textContent = config.format ? config.format(value) : String(value)
        }
      })
    }
  }

  return api
}
