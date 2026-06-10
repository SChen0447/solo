import * as dat from 'dat.gui'
import { WaveParams } from './wave'

export interface GUIParams extends WaveParams {
  magnitude: number
  speed: number
  reflectionEnabled: boolean
  refractionEnabled: boolean
}

export function createGUI(
  params: GUIParams,
  onChange: (params: GUIParams) => void
): dat.GUI {
  const gui = new dat.GUI()
  gui.domElement.style.userSelect = 'none'

  const folder = gui.addFolder('震源参数')
  folder.open()

  folder.add(params, 'magnitude', 1, 9, 1)
    .name('震级')
    .onChange(() => onChange(params))

  folder.add(params, 'speed', 0.5, 3, 0.1)
    .name('波速')
    .onChange(() => onChange(params))

  folder.add(params, 'reflectionEnabled')
    .name('反射波')
    .onChange(() => onChange(params))

  folder.add(params, 'refractionEnabled')
    .name('折射波')
    .onChange(() => onChange(params))

  return gui
}
