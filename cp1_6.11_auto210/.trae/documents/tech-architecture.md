## 1. 架构设计

```mermaid
flowchart TD
    "App.tsx 状态管理" --> "Roaster.tsx 烘焙机动画"
    "App.tsx 状态管理" --> "FlavorRadar.tsx 风味雷达图"
    "App.tsx 状态管理" --> "Dashboard.tsx 控制面板+拼配记录"
    "Roaster.tsx" --> "SVG滚筒+豆子渲染"
    "Roaster.tsx" --> "Canvas烟雾粒子系统"
    "FlavorRadar.tsx" --> "Canvas雷达图绘制"
    "FlavorRadar.tsx" --> "节点拖拽交互"
    "FlavorRadar.tsx" --> "历史曲线叠加"
    "Dashboard.tsx" --> "温度/风速控制"
    "Dashboard.tsx" --> "烘焙启停控制"
    "Dashboard.tsx" --> "拼配缩略图列表"
    "App.tsx" --> "flavorCalculator.ts 风味算法"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite@5
- 初始化工具：vite-init (react-ts模板)
- 状态管理：React useState/useReducer（项目规模适中，无需Zustand）
- 动画：requestAnimationFrame驱动烘焙动画，Canvas 2D绘制雷达图和烟雾粒子
- 后端：无
- 数据库：无（历史记录仅保存在内存/组件状态中）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 单页应用，包含所有功能模块 |

## 4. 核心数据流

```
用户操作 → 温度/风速状态更新 → Roaster组件接收props渲染动画
                                          ↓
                                    requestAnimationFrame循环
                                          ↓
                              豆子颜色渐变 + 烟雾粒子 + 滚筒旋转
                                          ↓
                              烘焙结束 → flavorCalculator计算风味分值
                                          ↓
                              FlavorRadar接收分值数组渲染雷达图
                                          ↓
                              用户拖拽节点 → 更新分值 → 重绘雷达图
                                          ↓
                              烘焙记录存入历史数组 → 拼配记录区渲染缩略图
```

## 5. 文件结构

```
├── package.json          # 依赖：react, react-dom, typescript, vite@5, @vitejs/plugin-react, framer-motion, uuid
├── vite.config.js        # 构建配置，启用React插件，base设为'./'
├── tsconfig.json         # 严格模式，target ES2020，moduleResolution bundler
├── index.html            # 入口，挂载div#root，引入reset-style
└── src/
    ├── App.tsx           # 主应用组件，管理状态
    ├── components/
    │   ├── Roaster.tsx   # 烘焙机组件（SVG滚筒+豆子+烟雾粒子）
    │   ├── FlavorRadar.tsx # 风味雷达图组件（Canvas+拖拽+叠加）
    │   └── Dashboard.tsx # 控制面板+拼配记录容器
    └── utils/
        └── flavorCalculator.ts # 风味算法纯函数
```

## 6. 风味算法设计

```typescript
interface FlavorScores {
  acidity: number;   // 酸度 0-10
  sweetness: number; // 甜度 0-10
  bitterness: number;// 苦度 0-10
  body: number;      // 醇厚度 0-10
  aroma: number;     // 香气 0-10
}

function calculateFlavor(temperature: number, windSpeed: number, duration: number): FlavorScores
```

算法逻辑：
- 温度越高 → 苦度和醇厚度越高，酸度和甜度越低
- 风速越高 → 香气越高，酸度和甜度越低
- 时长越长 → 苦度和醇厚度越高，香气先升后降
- 各值归一化至0-10范围
