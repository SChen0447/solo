import { v4 as uuidv4 } from 'uuid'

export type OrderStatus = 'in_progress' | 'pending' | 'completed'

export interface RawMaterial {
  id: string
  name: string
  unitPrice: number
  quantity: number
}

export interface Procedure {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
  proficiencyCoefficient: number
}

export interface Order {
  id: string
  customerName: string
  workName: string
  status: OrderStatus
  deadline: string
  estimatedPrice: number
  rawMaterials?: RawMaterial[]
  procedures?: Procedure[]
}

const studioName = '匠心手作工作室'

const mockOrders: Order[] = [
  {
    id: uuidv4(),
    customerName: '张小明',
    workName: '手工陶土茶杯套装',
    status: 'in_progress',
    deadline: '2026-06-20',
    estimatedPrice: 680,
    rawMaterials: [
      { id: uuidv4(), name: '高岭土', unitPrice: 45, quantity: 2 },
      { id: uuidv4(), name: '釉料（青瓷）', unitPrice: 80, quantity: 0.5 },
      { id: uuidv4(), name: '包装盒', unitPrice: 15, quantity: 4 }
    ],
    procedures: [
      { id: uuidv4(), name: '揉泥', startTime: '09:00', endTime: '09:30', duration: 30, proficiencyCoefficient: 1.0 },
      { id: uuidv4(), name: '拉坯', startTime: '09:30', endTime: '11:30', duration: 120, proficiencyCoefficient: 1.2 },
      { id: uuidv4(), name: '修坯', startTime: '14:00', endTime: '15:00', duration: 60, proficiencyCoefficient: 1.1 },
      { id: uuidv4(), name: '施釉', startTime: '15:10', endTime: '16:00', duration: 50, proficiencyCoefficient: 1.0 }
    ]
  },
  {
    id: uuidv4(),
    customerName: '李女士',
    workName: '黑胡桃木首饰盒',
    status: 'pending',
    deadline: '2026-06-25',
    estimatedPrice: 1200,
    rawMaterials: [
      { id: uuidv4(), name: '黑胡桃木板', unitPrice: 280, quantity: 1 },
      { id: uuidv4(), name: '黄铜合页', unitPrice: 25, quantity: 2 },
      { id: uuidv4(), name: '蜂蜡', unitPrice: 60, quantity: 0.2 },
      { id: uuidv4(), name: '内衬绒布', unitPrice: 35, quantity: 0.5 }
    ],
    procedures: [
      { id: uuidv4(), name: '下料', startTime: '09:00', endTime: '09:45', duration: 45, proficiencyCoefficient: 1.0 },
      { id: uuidv4(), name: '刨平', startTime: '10:00', endTime: '11:00', duration: 60, proficiencyCoefficient: 1.1 },
      { id: uuidv4(), name: '榫卯制作', startTime: '13:00', endTime: '16:00', duration: 180, proficiencyCoefficient: 1.3 }
    ]
  },
  {
    id: uuidv4(),
    customerName: '王先生',
    workName: '植鞣皮长款钱包',
    status: 'completed',
    deadline: '2026-06-10',
    estimatedPrice: 890,
    rawMaterials: [
      { id: uuidv4(), name: '意大利植鞣皮', unitPrice: 180, quantity: 4 },
      { id: uuidv4(), name: '蜡线', unitPrice: 12, quantity: 1 },
      { id: uuidv4(), name: '黄铜按扣', unitPrice: 18, quantity: 1 },
      { id: uuidv4(), name: '床面处理剂', unitPrice: 45, quantity: 0.1 }
    ],
    procedures: [
      { id: uuidv4(), name: '裁皮', startTime: '10:00', endTime: '10:30', duration: 30, proficiencyCoefficient: 1.0 },
      { id: uuidv4(), name: '打斩', startTime: '10:45', endTime: '11:45', duration: 60, proficiencyCoefficient: 1.1 },
      { id: uuidv4(), name: '手缝', startTime: '14:00', endTime: '17:00', duration: 180, proficiencyCoefficient: 1.2 },
      { id: uuidv4(), name: '封边', startTime: '17:10', endTime: '18:00', duration: 50, proficiencyCoefficient: 1.1 }
    ]
  },
  {
    id: uuidv4(),
    customerName: '陈小姐',
    workName: '青瓷花瓶（定制款）',
    status: 'in_progress',
    deadline: '2026-07-05',
    estimatedPrice: 2500,
    rawMaterials: [
      { id: uuidv4(), name: '特级高岭土', unitPrice: 65, quantity: 5 },
      { id: uuidv4(), name: '龙泉青瓷釉', unitPrice: 120, quantity: 1 },
      { id: uuidv4(), name: '金彩颜料', unitPrice: 200, quantity: 0.1 }
    ],
    procedures: [
      { id: uuidv4(), name: '泥料准备', startTime: '09:00', endTime: '10:00', duration: 60, proficiencyCoefficient: 1.0 },
      { id: uuidv4(), name: '手工盘筑', startTime: '10:15', endTime: '15:00', duration: 285, proficiencyCoefficient: 1.3 },
      { id: uuidv4(), name: '素烧', startTime: '08:00', endTime: '18:00', duration: 600, proficiencyCoefficient: 0.3 }
    ]
  },
  {
    id: uuidv4(),
    customerName: '赵先生',
    workName: '樱桃木茶盘',
    status: 'pending',
    deadline: '2026-06-30',
    estimatedPrice: 1500,
    rawMaterials: [
      { id: uuidv4(), name: '樱桃木整板', unitPrice: 450, quantity: 1 },
      { id: uuidv4(), name: '食品级木蜡油', unitPrice: 80, quantity: 0.2 },
      { id: uuidv4(), name: '硅胶防滑垫', unitPrice: 8, quantity: 4 }
    ],
    procedures: [
      { id: uuidv4(), name: '选料开料', startTime: '09:00', endTime: '10:00', duration: 60, proficiencyCoefficient: 1.0 },
      { id: uuidv4(), name: '铣型打磨', startTime: '10:15', endTime: '14:00', duration: 225, proficiencyCoefficient: 1.2 },
      { id: uuidv4(), name: '上油养护', startTime: '14:30', endTime: '16:00', duration: 90, proficiencyCoefficient: 1.0 }
    ]
  },
  {
    id: uuidv4(),
    customerName: '刘女士',
    workName: '手工编织皮革手提包',
    status: 'in_progress',
    deadline: '2026-06-28',
    estimatedPrice: 3200,
    rawMaterials: [
      { id: uuidv4(), name: '头层牛皮条', unitPrice: 35, quantity: 30 },
      { id: uuidv4(), name: '内衬帆布', unitPrice: 40, quantity: 1 },
      { id: uuidv4(), name: '真皮提手', unitPrice: 120, quantity: 1 },
      { id: uuidv4(), name: '磁吸扣', unitPrice: 30, quantity: 1 }
    ],
    procedures: [
      { id: uuidv4(), name: '裁条备料', startTime: '09:00', endTime: '10:30', duration: 90, proficiencyCoefficient: 1.0 },
      { id: uuidv4(), name: '编织主体', startTime: '10:45', endTime: '18:00', duration: 435, proficiencyCoefficient: 1.2 },
      { id: uuidv4(), name: '组装配件', startTime: '09:00', endTime: '11:00', duration: 120, proficiencyCoefficient: 1.1 }
    ]
  },
  {
    id: uuidv4(),
    customerName: '孙先生',
    workName: '紫砂茶壶（半手工）',
    status: 'completed',
    deadline: '2026-06-08',
    estimatedPrice: 1800,
    rawMaterials: [
      { id: uuidv4(), name: '宜兴紫砂泥', unitPrice: 150, quantity: 1 },
      { id: uuidv4(), name: '金刚砂', unitPrice: 25, quantity: 0.2 },
      { id: uuidv4(), name: '专用包装盒', unitPrice: 60, quantity: 1 }
    ],
    procedures: [
      { id: uuidv4(), name: '打泥片', startTime: '09:00', endTime: '10:00', duration: 60, proficiencyCoefficient: 1.1 },
      { id: uuidv4(), name: '围身筒', startTime: '10:15', endTime: '12:00', duration: 105, proficiencyCoefficient: 1.2 },
      { id: uuidv4(), name: '装壶嘴壶把', startTime: '14:00', endTime: '15:30', duration: 90, proficiencyCoefficient: 1.3 },
      { id: uuidv4(), name: '明针修整', startTime: '15:45', endTime: '17:00', duration: 75, proficiencyCoefficient: 1.1 }
    ]
  },
  {
    id: uuidv4(),
    customerName: '周小姐',
    workName: '手工皮革笔记本',
    status: 'pending',
    deadline: '2026-07-10',
    estimatedPrice: 450,
    rawMaterials: [
      { id: uuidv4(), name: '疯马皮', unitPrice: 90, quantity: 2 },
      { id: uuidv4(), name: '道林纸内页', unitPrice: 25, quantity: 1 },
      { id: uuidv4(), name: '蜡线', unitPrice: 12, quantity: 0.5 },
      { id: uuidv4(), name: '装订铆钉', unitPrice: 5, quantity: 4 }
    ],
    procedures: [
      { id: uuidv4(), name: '裁切皮料', startTime: '14:00', endTime: '14:30', duration: 30, proficiencyCoefficient: 1.0 },
      { id: uuidv4(), name: '制作内页', startTime: '14:45', endTime: '15:15', duration: 30, proficiencyCoefficient: 1.0 },
      { id: uuidv4(), name: '装订缝合', startTime: '15:30', endTime: '16:30', duration: 60, proficiencyCoefficient: 1.1 }
    ]
  },
  {
    id: uuidv4(),
    customerName: '吴先生',
    workName: '榉木榫卯小方凳',
    status: 'in_progress',
    deadline: '2026-07-02',
    estimatedPrice: 680,
    rawMaterials: [
      { id: uuidv4(), name: '榉木方料', unitPrice: 120, quantity: 2 },
      { id: uuidv4(), name: '木砂纸套装', unitPrice: 30, quantity: 1 },
      { id: uuidv4(), name: '天然木蜡油', unitPrice: 60, quantity: 0.15 }
    ],
    procedures: [
      { id: uuidv4(), name: '开料断料', startTime: '09:00', endTime: '10:00', duration: 60, proficiencyCoefficient: 1.0 },
      { id: uuidv4(), name: '开榫打卯', startTime: '10:15', endTime: '15:00', duration: 285, proficiencyCoefficient: 1.3 },
      { id: uuidv4(), name: '打磨上油', startTime: '15:30', endTime: '17:00', duration: 90, proficiencyCoefficient: 1.1 }
    ]
  },
  {
    id: uuidv4(),
    customerName: '郑女士',
    workName: '手绘陶瓷餐盘套装',
    status: 'completed',
    deadline: '2026-06-05',
    estimatedPrice: 960,
    rawMaterials: [
      { id: uuidv4(), name: '素烧白瓷盘', unitPrice: 35, quantity: 4 },
      { id: uuidv4(), name: '釉下彩颜料', unitPrice: 15, quantity: 6 },
      { id: uuidv4(), name: '透明釉', unitPrice: 50, quantity: 0.5 }
    ],
    procedures: [
      { id: uuidv4(), name: '图案设计', startTime: '09:00', endTime: '10:30', duration: 90, proficiencyCoefficient: 1.0 },
      { id: uuidv4(), name: '手工描绘', startTime: '10:45', endTime: '16:00', duration: 315, proficiencyCoefficient: 1.2 },
      { id: uuidv4(), name: '釉烧', startTime: '08:00', endTime: '20:00', duration: 720, proficiencyCoefficient: 0.2 }
    ]
  }
]

export function getStudioName(): string {
  return studioName
}

export function getOrders(): Order[] {
  return mockOrders.map(order => ({
    ...order,
    rawMaterials: undefined,
    procedures: undefined
  }))
}

export function getOrderById(id: string): Order | undefined {
  const order = mockOrders.find(o => o.id === id)
  if (!order) return undefined
  return JSON.parse(JSON.stringify(order))
}
