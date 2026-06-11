## 1. 架构设计

```mermaid
graph TD
    "前端层" --> "React组件层"
    "React组件层" --> "App.tsx 主状态管理"
    "App.tsx 主状态管理" --> "Hourglass.tsx"
    "App.tsx 主状态管理" --> "MemoryCollector.tsx"
    "Hourglass.tsx" --> "useParticleSystem Hook"
    "useParticleSystem Hook" --> "Canvas 2D渲染引擎"
    "App.tsx 主状态管理" --> "Zustand 状态Store"
    "Zustand 状态Store" --> "沙漏状态"
    "Zustand 状态Store" --> "记忆碎片状态"
    "Zustand 状态Store" --> "解锁进度状态"
    "Zustand 状态Store" --> "主题状态"
    "工具层" --> "colors.ts 颜色主题"
    "工具层" --> "sound.ts 音效"
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript
- **构建工具**：Vite@5 + @vitejs/plugin-react
- **动画库**：framer-motion（用于UI过渡动画）
- **粒子系统**：自研Canvas 2D粒子引擎（useParticleSystem Hook）
- **沙漏渲染**：SVG + Canvas混合渲染（SVG绘制沙漏外壳，Canvas绘制沙粒和碎片）
- **音效**：Web Audio API（500Hz正弦波0.1秒）
- **状态管理**：Zustand
- **唯一ID生成**：uuid
- **无后端**：纯前端应用

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主游戏页面（单页应用，无路由切换） |

## 4. 文件结构

```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── components/
    │   ├── Hourglass.tsx
    │   └── MemoryCollector.tsx
    ├── hooks/
    │   └── useParticleSystem.ts
    └── utils/
        ├── colors.ts
        └── sound.ts
```

## 5. 核心数据模型

### 5.1 沙粒粒子数据结构

```typescript
interface SandParticle {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  velocityX: number;
  velocityY: number;
  offsetX: number;
  settled: boolean;
  shape: number[];
}
```

### 5.2 记忆碎片数据结构

```typescript
type FragmentType = 'photo' | 'text';

interface MemoryFragment {
  id: string;
  type: FragmentType;
  x: number;
  y: number;
  collected: boolean;
  size: number;
}

interface MemoryCard {
  id: string;
  type: FragmentType;
  content: string;
  createdAt: number;
}
```

### 5.3 沙漏状态数据结构

```typescript
type MaterialLevel = 'copper' | 'silver' | 'gold';
type ThemeColor = 'desert' | 'volcano' | 'ocean' | 'forest' | 'aurora';

interface HourglassState {
  isFlipped: boolean;
  isFlipping: boolean;
  speed: number;
  theme: ThemeColor;
  materialLevel: MaterialLevel;
  unlockProgress: number;
  isIdle: boolean;
  particles: SandParticle[];
  fragments: MemoryFragment[];
  collectedFragments: MemoryFragment[];
  memoryCards: MemoryCard[];
}
```

## 6. 核心算法

### 6.1 沙粒下落速度映射

```
速度(粒/秒) = 8 + (sliderValue - 20) * (40 - 8) / (80 - 20)
```
- sliderValue=20 → 8粒/秒
- sliderValue=80 → 40粒/秒

### 6.2 沙丘堆积算法

- 下层沙粒按到达顺序堆积
- 堆积高度 = 已落沙粒数 × 线性系数（最高80px）
- 沙粒落在沙丘表面后标记为settled，停止运动

### 6.3 碎片生成间隔

- 每3-5秒随机间隔生成1块碎片
- 碎片类型随机（照片/文字各50%）
- 碎片下落速度 = 沙粒下落速度 × 0.7

### 6.4 解锁等级映射

| 等级 | 材质颜色 | 材质光晕 | 背景布景 |
|------|----------|----------|----------|
| 铜(初始) | #b87333 | 无 | 象牙白渐变 |
| 银(第1次) | #c0c0c0 | 径向光晕 | 星夜深蓝#0a1128+200颗闪烁星星 |
| 金(第2次) | #ffd700 | 径向光晕 | 星云紫#1a0a2e+旋转银河光晕 |
