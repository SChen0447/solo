## 1. 架构设计

```mermaid
graph TD
    A["用户交互层 (UI) --> B["主控制层 (main.ts)
    B --> C["城市网格模块 (cityGrid.ts)"]
    B --> D["交通模拟模块 (trafficSim.ts)"]
    C --> E["Three.js 场景层"]
    D --> E
    B --> E
    E --> F["浏览器 WebGL 渲染"]
```

## 2. 技术说明

- **前端框架**: 原生 TypeScript + Three.js，无前端UI框架
- **构建工具**: Vite 5.x
- **3D渲染**: Three.js r160+
- **初始化工具**: vite-init vanilla-ts 模板
- **后端**: 无后端，纯前端应用
- **数据库**: 无
- **状态管理**: 模块内部变量 + 回调函数通信

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，3D城市场景与控制面板 |

## 4. 文件结构与模块职责

### 4.1 项目目录结构

```
auto12/
├── index.html                 # 入口HTML
├── package.json              # 依赖配置
├── vite.config.js           # Vite构建配置
├── tsconfig.json           # TypeScript配置
└── src/
    ├── main.ts             # 主程序入口
    ├── cityGrid.ts         # 城市网格与道路生成
    ├── trafficSim.ts       # 车辆与红绿灯模拟
    └── ui.ts             # UI控件与事件绑定
```

### 4.2 模块接口定义

#### cityGrid.ts - 城市网格模块

**类型定义**

```typescript
export interface RoadNode {
  x: number;
  z: number;
  isIntersection: boolean;
}

export interface RoadSegment {
  start: RoadNode;
  end: RoadNode;
  direction: 'horizontal' | 'vertical';
}

export interface CityGridData {
  roadNodes: RoadNode[];
  roadSegments: RoadSegment[];
  intersections: Map<string, IntersectionData>;
  roadMeshes: THREE.Mesh[];
  buildingMeshes: THREE.Mesh[];
  trafficLightMeshes: THREE.Mesh[];
}

export interface IntersectionData {
  x: number;
  z: number;
  id: string;
}
```

**导出函数**

- `generateCityGrid(density: number): CityGridData` - 根据密度参数生成路网、建筑、信号灯
- `disposeCityGrid(data: CityGridData): void` - 清理网格资源

#### trafficSim.ts - 交通模拟模块

**类型定义**

```typescript
export type TrafficLightMode = 'fixed' | 'adaptive' | 'none';

export interface Vehicle {
  mesh: THREE.Mesh;
  currentSegment: RoadSegment;
  speed: number;
  progress: number;
  direction: 'forward' | 'left' | 'right';
}

export interface TrafficSimData {
  vehicles: Vehicle[];
  trafficLightStates: Map<string, { nsGreen: boolean; ewGreen: boolean }>;
}
```

**导出函数**

- `createTrafficSim(roadData: CityGridData, vehicleCount: number): TrafficSimData` - 创建车辆与初始交通状态
- `updateTrafficSim(delta: number, mode: TrafficLightMode): void` - 每帧更新车辆位置与信号灯状态
- `setTrafficLightMode(mode: TrafficLightMode): void` - 切换红绿灯模式
- `disposeTrafficSim(data: TrafficSimData): void` - 清理模拟资源

#### ui.ts - UI模块

**类型定义**

```typescript
export interface UICallbacks {
  onDensityChange: (density: number) => void;
  onVehicleCountChange: (count: number) => void;
  onTrafficLightModeChange: (mode: TrafficLightMode) => void;
}

export interface UIState {
  density: number;
  vehicleCount: number;
  trafficLightMode: TrafficLightMode;
}
```

**导出函数**

- `createUI(callbacks: UICallbacks): UIState` - 创建所有UI控件并绑定事件
- `updateFPS(fps: number): void` - 更新FPS显示

### 4.3 main.ts - 主程序入口

负责初始化Three.js场景、相机、渲染器、OrbitControls，协调各模块通信，管理重建时的淡入淡出过渡动画，启动requestAnimationFrame循环。

## 5. 核心算法

### 5.1 路网生成算法
- 基于密度参数（0.3-1.0）计算网格间距
- 密度越高，道路越密集，街区越小
- 6x6基础街区，密度控制额外道路插入

### 5.2 车辆移动算法
- 每辆车沿道路段匀速行驶
- 到达路口时查询信号灯状态
- 绿灯时按概率选择直行/左转/右转
- 红灯时减速停车等待

### 5.3 信号灯控制算法
- **固定周期模式：NS/EW方向交替，周期5秒
- **自适应模式**：检测各方向排队车辆，动态调整绿灯时长
- **无灯模式**：车辆减速观察后直接通过

## 6. 性能优化策略
- 几何体复用（BoxGeometry共享实例
- 材质复用
- 路口状态更新避免频繁创建/销毁Mesh
- 车辆位置直接操作.matrix更新而非重新计算
- 防抖2秒重建路网使用防抖
