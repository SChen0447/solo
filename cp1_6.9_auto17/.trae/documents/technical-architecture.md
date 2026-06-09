## 1. 架构设计
```mermaid
graph TD
    "index.html" --> "main.ts 主入口"
    "main.ts 主入口" --> "simulation.ts 模拟引擎"
    "main.ts 主入口" --> "statsPanel.ts 统计面板"
    "simulation.ts 模拟引擎" --> "Three.js 渲染层"
    "statsPanel.ts 统计面板" --> "DOM 更新层"
```

## 2. 技术描述
- **前端框架**：TypeScript + Vite
- **3D渲染**：three@0.160.0
- **类型定义**：@types/three
- **启动脚本**：npm run dev

## 3. 文件结构
| 文件 | 职责 |
|------|------|
| package.json | 依赖管理与启动脚本 |
| tsconfig.json | TypeScript严格模式配置 |
| vite.config.js | Vite构建配置 |
| index.html | 入口HTML，3D画布与UI覆盖层 |
| src/main.ts | 场景初始化、动画循环、UI事件管理 |
| src/simulation.ts | 粒子数组、运动更新、碰撞检测 |
| src/statsPanel.ts | 统计数据实时更新DOM |

## 4. 核心数据模型

### 4.1 Particle 粒子
```typescript
interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  radius: number;
  baseColor: THREE.Color;
  flashTimer: number;
}
```

### 4.2 SimulationConfig 模拟配置
```typescript
interface SimulationConfig {
  particleCount: number;
  speedFactor: number;
  boundingBox: number;
  collisionRetention: number;
  flashDuration: number;
}
```

## 5. 碰撞检测策略
- 粒子与边界盒：完全弹性碰撞，法向速度反转
- 粒子间碰撞：非弹性碰撞，动能保留80%，基于球-球相交检测
- 性能优化：粒子数>150时每帧仅检测随机50%粒子对

## 6. UI组件
- **StatsPanel**：fixed定位毛玻璃面板，3行数据，CSS transition 0.3s
- **ControlBar**：fixed底部中央，2个range input + 1个button，响应式布局
