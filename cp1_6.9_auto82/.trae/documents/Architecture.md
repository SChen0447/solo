## 1. 架构设计

```mermaid
graph TD
    "Browser" --> "index.html"
    "index.html" --> "main.ts"
    "main.ts" --> "PlantManager.ts"
    "main.ts" --> "EnvironmentUI.ts"
    "main.ts" --> "BubbleSystem.ts"
    "EnvironmentUI.ts" --> "PlantManager.ts"
    "EnvironmentUI.ts" --> "BubbleSystem.ts"
    "PlantManager.ts" --> "Three.js Scene"
    "BubbleSystem.ts" --> "Three.js Scene"
    "main.ts" --> "Three.js Scene"
```

## 2. 技术说明

- 前端框架：纯 TypeScript + Three.js@0.160.0（无 React/Vue，按用户要求）
- 构建工具：Vite@5.x
- 模块划分：
  - `src/main.ts`：应用主入口，Three.js 场景初始化、动画循环
  - `src/PlantManager.ts`：植物创建、删除、状态管理、颜色渐变
  - `src/EnvironmentUI.ts`：DOM 控制面板、滑块事件、参数传递
  - `src/BubbleSystem.ts`：氧气气泡生成、生命周期、对象池回收
- 无后端、无数据库、纯前端模拟

## 3. 路由定义
| 路由 | 用途 |
|-----|------|
| / | 主模拟场景页面（单页应用，无额外路由） |

## 4. 数据模型

### 4.1 环境参数
```typescript
interface EnvironmentParams {
  light: number;      // 0-100 lux
  co2: number;        // 200-2000 ppm
  water: number;      // 0-100 %
}
```

### 4.2 植物对象
```typescript
type PlantType = 'fern' | 'sunflower' | 'cactus';

interface Plant {
  id: string;
  type: PlantType;
  mesh: THREE.Group;
  position: THREE.Vector3;
  health: number;     // 0-100
  targetColor: THREE.Color;
  currentColor: THREE.Color;
  witherOpacity: number; // 0-0.8
}
```

### 4.3 气泡对象
```typescript
interface Bubble {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;       // 剩余寿命 0-3 秒
  maxLife: number;
  phase: number;      // 正弦波动相位
}
```

## 5. 文件结构

```
├── package.json          # 项目依赖与脚本
├── tsconfig.json         # TypeScript 严格模式配置
├── vite.config.js        # Vite 构建配置
├── index.html            # 入口 HTML
└── src/
    ├── main.ts           # 主入口：场景、相机、控制器、循环
    ├── PlantManager.ts   # 植物管理系统
    ├── EnvironmentUI.ts  # UI 控制面板
    └── BubbleSystem.ts   # 气泡粒子系统
```

## 6. 核心配置参数

| 参数 | 值 | 说明 |
|-----|---|------|
| 草地半径 | 20 单位 | 圆形悬浮草地 |
| 相机限制半径 | 40 单位 | OrbitControls maxDistance |
| 植物高度 | 2-4 单位 | 三种植物模型 |
| 植物最大数量 | 10 株 | addPlant 上限检查 |
| 气泡半径 | 0.15 单位 | 球体几何体 |
| 气泡速度 | 0.3 单位/秒 | 向上飘移 |
| 气泡寿命 | 3 秒 | 透明度从 0.6 渐变到 0 |
| 气泡生成频率 | 5个/秒 | 最佳环境时每株植物 |
| 颜色渐变时间 | 0.5 秒 | 植物叶片颜色过渡 |
| UI 过渡时间 | 0.15 秒 | 滑块、视角等交互 |
