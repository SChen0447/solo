import { v4 as uuidv4 } from 'uuid'
import { Room, Pin, Exhibit } from '../types'

const COLORS = ['#f0e6d3', '#c9d8e0', '#d4e4d1', '#e6d4e8', '#f9d5c7', '#f0e0a8', '#d6d9e0', '#e8d4c4', '#cfe5dc', '#e5d1e0', '#d9e6c9', '#f2d4c4']

function createExhibit(
  name: string,
  era: string,
  material: string,
  size: string,
  description: string,
  start: string,
  end: string,
  thumb: string
): Exhibit {
  return {
    id: uuidv4(),
    name,
    era,
    material,
    size,
    description,
    thumbnailColor: thumb,
    gradientStart: start,
    gradientEnd: end,
  }
}

export const sampleRooms: Room[] = [
  { id: uuidv4(), name: '古代书画厅', x: 40, y: 40, width: 500, height: 340, bgColor: COLORS[0] },
  { id: uuidv4(), name: '当代雕塑厅', x: 600, y: 40, width: 540, height: 340, bgColor: COLORS[1] },
  { id: uuidv4(), name: '陶瓷艺术厅', x: 40, y: 420, width: 500, height: 340, bgColor: COLORS[2] },
  { id: uuidv4(), name: '现代摄影厅', x: 600, y: 420, width: 540, height: 340, bgColor: COLORS[3] },
]

export function createSamplePins(rooms: Room[]): Pin[] {
  if (rooms.length < 4) return []
  const exhibits: Exhibit[] = [
    createExhibit('山水长卷', '北宋', '绢本设色', '320×45cm', '描绘江南山水秀色，笔触细腻，意境悠远。', '#4a6fa5', '#7b9fd4', '#5a8fc4'),
    createExhibit('行书真迹', '明代', '纸本墨笔', '180×60cm', '笔势奔放流畅，一气呵成，为书法家晚年精品。', '#8b5a3c', '#c48b6a', '#a47254'),
    createExhibit('青铜时代', '2023', '不锈钢雕塑', '高220cm', '以现代解构语言重构古典青铜纹样的空间装置。', '#6b5b95', '#9e8ec9', '#8575ad'),
    createExhibit('流动的光', '2022', '树脂与光纤', '150×80×80cm', '光纤在树脂中流动，捕捉光线在空间中的痕迹。', '#2c6e6e', '#5ab8b8', '#42a0a0'),
    createExhibit('青花瓷瓶', '清代乾隆', '高岭土釉彩', '高45cm', '缠枝莲纹布局繁密，青花发色纯正典雅。', '#1e3a5f', '#4a7ab0', '#345a88'),
    createExhibit('釉里红罐', '元代', '铜红釉', '高38cm', '釉里红发色纯正，呈色稳定，存世稀少。', '#8b2500', '#c9543a', '#aa3a20'),
    createExhibit('城市光影', '2024', '数字微喷', '100×70cm', '都市夜色中的光轨与倒影，呈现现代都市的脉动。', '#3a1c5c', '#7c5aa0', '#5b3d7e'),
    createExhibit('人像系列', '2023', '银盐黑白', '60×50cm', '捕捉平凡人物瞬间情绪的纪实摄影作品。', '#2b2b2b', '#6a6a6a', '#4a4a4a'),
  ]

  const positions = [
    { roomIdx: 0, relX: 0.3, relY: 0.4 },
    { roomIdx: 0, relX: 0.7, relY: 0.6 },
    { roomIdx: 1, relX: 0.35, relY: 0.5 },
    { roomIdx: 1, relX: 0.7, relY: 0.35 },
    { roomIdx: 2, relX: 0.3, relY: 0.5 },
    { roomIdx: 2, relX: 0.65, relY: 0.55 },
    { roomIdx: 3, relX: 0.35, relY: 0.45 },
    { roomIdx: 3, relX: 0.7, relY: 0.6 },
  ]

  return exhibits.map((ex, i) => {
    const room = rooms[positions[i].roomIdx]
    return {
      id: uuidv4(),
      roomId: room.id,
      x: room.x + room.width * positions[i].relX,
      y: room.y + room.height * positions[i].relY,
      exhibit: ex,
    }
  })
}

export const PALETTE = [
  '#f0e6d3', '#c9d8e0', '#d4e4d1', '#e6d4e8',
  '#f9d5c7', '#f0e0a8', '#d6d9e0', '#e8d4c4',
  '#cfe5dc', '#e5d1e0', '#d9e6c9', '#f2d4c4',
]
