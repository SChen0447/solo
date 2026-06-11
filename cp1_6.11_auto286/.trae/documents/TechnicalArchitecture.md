## 1. 架构设计
```mermaid
flowchart TD
    "React App (App.tsx)" --> "Scene3D.tsx"
    "React App (App.tsx)" --> "BiomeCanvas.tsx"
    "React App (App.tsx)" --> "ControlPanel.tsx"
    "React App (App.tsx)" --> "HUD.tsx"
    "Scene3D.tsx" --> "Three.js (3D渲染)"
    "BiomeCanvas.tsx" --> "Canvas 2D (生物群落)"
    "ControlPanel.tsx" --> "lodash throttle"
    "HUD.tsx" --> "SVG环形进度条"
    "App.tsx" --> "ecosystemLogic.ts"
    "ecosystemLogic.ts" --> "perlin.ts"
    "Scene3D.tsx" --> "perlin.ts"
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Vite@5
- 3D渲染：Three@0.160（ConeGeometry喷口+Points粒子系统+PlaneGeometry地形）
- 2D渲染：Canvas 2D API（生物群落+热力图覆盖层）
- UI动画：framer-motion（参数过渡、面板动画）
- 工具库：lodash（参数节流/throttle）
- 噪声生成：自实现Perlin噪声（海底地形纹理）
- 状态管理：React useState + props传递（轻量级，无需zustand）
- 初始化工具：vite-init（react-ts模板）

## 3. 路由定义
本项目为单页面应用，无路由。

| 路由 | 用途 |
|------|------|
| / | 全屏深海热泉生态可视化（唯一页面） |

## 4. 数据流设计

### 4.1 核心状态
```typescript
interface VentParams {
  temperature: number;       // 50-400°C
  sulfideConcentration: number; // 0-100%
  eruptionMode: 'continuous' | 'intermittent' | 'pulse';
}

interface BiomeState {
  microbialMat: { density: number; opacity: number; distribution: Point[] };
  tubeWorms: { density: number; worms: WormData[] };
  mussels: { density: number; positions: Point[] };
  blindShrimp: { count: number; positions: MovingPoint[] };
  healthIndex: number; // 0-100
}
```

### 4.2 参数→群落映射规则
- 高温(>300°C)+高硫化物(>70%) → 管虫优势，微生物席密度高
- 中温(150-300°C)+中硫化物(30-70%) → 贻贝主导，生物多样性最高
- 低温(<150°C)+低硫化物(<30%) → 贻贝主导，盲虾聚集
- 脉冲模式 → 群落波动大，健康指数中等
- 持续模式 → 稳定群落，健康指数高
- 间歇模式 → 中等波动

### 4.3 性能约束
- 粒子总数 ≤ 8000
- Canvas重绘使用requestAnimationFrame + 离屏渲染
- Three.js几何体实例化复用
- 生物个体使用Points批量渲染
- 组件卸载时清理所有animationFrame和定时器

## 5. 文件结构
```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── components/
    │   ├── Scene3D.tsx
    │   ├── BiomeCanvas.tsx
    │   ├── ControlPanel.tsx
    │   └── HUD.tsx
    └── utils/
        ├── ecosystemLogic.ts
        └── perlin.ts
```
