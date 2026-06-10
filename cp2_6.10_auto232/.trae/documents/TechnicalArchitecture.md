## 1. 架构设计

```mermaid
graph TD
    "浏览器用户" --> "index.html 入口"
    "index.html 入口" --> "main.ts 主控制器"
    "main.ts 主控制器" --> "Three.js 场景渲染循环"
    "main.ts 主控制器" --> "coralReef.ts 珊瑚管理模块"
    "main.ts 主控制器" --> "uiController.ts UI交互模块"
    "main.ts 主控制器" --> "statistics.ts 统计可视化模块"
    "coralReef.ts 珊瑚管理模块" --> "statistics.ts 统计可视化模块"
    "uiController.ts UI交互模块" --> "coralReef.ts 珊瑚管理模块"
    "uiController.ts UI交互模块" --> "statistics.ts 统计可视化模块"
    "coralReef.ts 珊瑚管理模块" -- "输出白化指数/点击数据" --> "uiController.ts UI交互模块"
    "coralReef.ts 珊瑚管理模块" -- "输出平均白化指数" --> "statistics.ts 统计可视化模块"
    "uiController.ts UI交互模块" -- "水温控制/播放/重置" --> "coralReef.ts 珊瑚管理模块"
    "uiController.ts UI交互模块" -- "CSV导入/重置" --> "statistics.ts 统计可视化模块"
    "statistics.ts 统计可视化模块" -- "Chart.js折线图" --> "浏览器DOM"
```

## 2. 技术描述

- **前端框架**：原生 TypeScript 5（不使用React/Vue，用户明确要求）
- **3D引擎**：Three.js 0.160（含OrbitControls轨道控制器）
- **构建工具**：Vite 5
- **图表库**：Chart.js 4
- **工具库**：lodash 4（工具函数）、uuid 9（珊瑚唯一ID）
- **类型声明**：@types/three
- **后端**：无（纯前端浏览器应用）
- **数据库**：无（CSV本地导入）

## 3. 文件结构

| 文件路径 | 职责 |
|----------|------|
| `package.json` | 项目依赖与npm脚本配置 |
| `index.html` | 入口页面，全屏Canvas容器与基础DOM结构 |
| `tsconfig.json` | TypeScript严格模式配置 |
| `vite.config.js` | Vite构建配置 |
| `src/main.ts` | 主入口：Three场景初始化、渲染循环、全局键盘事件绑定 |
| `src/coralReef.ts` | 珊瑚模块：程序化珊瑚网格生成、水温颜色映射、白化指数计算、Raycaster点击检测 |
| `src/uiController.ts` | UI模块：浮动控制面板DOM创建、水温滑块事件、播放按钮、信息面板、波纹动画 |
| `src/statistics.ts` | 统计模块：白化指数时间序列、Chart.js折线图、CSV基线数据解析 |

## 4. 数据模型与类型定义

### 4.1 珊瑚数据模型

```typescript
type CoralShape = 'branching' | 'massive' | 'foliose';

interface CoralSpecies {
  name: string;
  shape: CoralShape;
  heatTolerance: number; // 1-5，耐热系数
  baseAlgaeDensity: number; // 初始共生藻密度
}

interface Coral {
  id: string; // uuid
  species: CoralSpecies;
  position: THREE.Vector3;
  scale: number;
  mesh: THREE.Group | THREE.Mesh;
  bleachingIndex: number; // 0-100
  targetBleachingIndex: number;
  algaeDensity: number; // 共生藻密度估算值
}
```

### 4.2 鱼群数据模型

```typescript
interface Fish {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  speed: number;
}
```

### 4.3 统计数据模型

```typescript
interface BleachingDataPoint {
  time: number; // 模拟时间（秒）
  avgBleaching: number; // 0-100 平均白化指数
}

interface BaselineDataPoint {
  temperature: number; // °C
  bleachingRate: number; // 0-100 白化率
}
```

## 5. 核心算法说明

### 5.1 水温→白化指数映射

```
输入: temperature (°C), heatTolerance (1-5)
输出: bleachingIndex (0-100)

阈值:
  temperature ≤ 28°C  → bleachingIndex ≈ 0（健康）
  temperature = 30°C  → bleachingIndex ≈ 30（开始白化）
  temperature = 32°C  → bleachingIndex ≈ 70（中度白化）
  temperature ≥ 34°C  → bleachingIndex ≈ 100（完全白化）

修正:
  heatTolerance越高，白化曲线越平缓（偏移+0.5°C/级）
  使用smoothstep平滑插值避免突变
```

### 5.2 颜色插值算法

```
健康色 (25°C): #d4a574 (黄棕色)
警告色 (30°C): #e8e0c8 (浅米白)
白化色 (34°C): #ffffff (纯白)

根据bleachingIndex (0-100):
  0-30:   健康色 → 警告色 插值
  30-100: 警告色 → 白化色 插值
  使用 THREE.Color.lerp 每帧插值，0.8秒平滑过渡
```

### 5.3 鱼群游动算法

```
每帧更新:
  1. 基础方向随机扰动 (±15°/秒)
  2. 边界约束: 超出±20范围时向心转向
  3. 白化指数 > 70%时: 鱼群可见比例 = max(20%, 1 - (bleaching - 70) / 37.5)
  4. 速度: 0.2-0.5 单位/秒，随机初始化
```

### 5.4 共生藻密度估算

```
algaeDensity = baseAlgaeDensity × (1 - bleachingIndex / 100) × 10⁶ cells/cm²
```

## 6. 事件与数据流

| 事件源 | 事件 | 数据流向 | 处理函数 |
|--------|------|----------|----------|
| 水温滑块 | input | uiController → coralReef | coralReef.setTemperature() |
| 播放按钮 | click | uiController → main → coralReef | main.startSimulation() |
| 点击珊瑚 | pointerdown | main(Raycaster) → coralReef → uiController | coralReef.getCoralAt() → uiController.showInfo() |
| 键盘H | keydown | main → coralReef | coralReef.toggleView() |
| 键盘R | keydown | main → coralReef → statistics → uiController | reset All |
| 键盘S | keydown | main → renderer | renderer.domElement.toDataURL() |
| 键盘空格 | keydown | main | toggleSimulationPause() |
| CSV导入 | change | uiController → statistics | statistics.importBaselineCSV() |
| 每帧渲染 | animationFrame | coralReef → statistics | statistics.recordDataPoint() |
