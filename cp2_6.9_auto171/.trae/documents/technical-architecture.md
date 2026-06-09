## 1. 架构设计

```mermaid
graph TD
    subgraph "入口层
        A["main.ts<br/>应用入口"]
    end
    
    subgraph "模拟层 src/simulation"
        B["OrbitSimulator<br/>N体引力计算"]
        C["PlanetFactory<br/>行星工厂"]
    end
    
    subgraph "UI层 src/ui"
        D["UIManager<br/>交互管理"]
        E["Renderer<br/>Three.js渲染封装"]
    end
    
    subgraph "外部依赖"
        F["three.js<br/>3D渲染"]
        G["Vite<br/>构建工具"]
    end
    
    A --> B
    A --> D
    A --> E
    C --> B
    D --> B
    B --> E
    E --> F
    A --> G
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#fff3e0
    style D fill:#f3e5f5
    style E fill:#f3e5f5
```

**数据流向说明：**
- `main.ts` 初始化场景/相机/渲染器，创建 SimulationOrchestrator 和 UIManager
- `PlanetFactory` → 输出初始行星数组 → `OrbitSimulator`
- `UIManager` 用户交互 → 调用 `OrbitSimulator` 接口 → 更新物理参数
- `OrbitSimulator` 计算行星状态 → `Renderer` 更新 Three.js 对象

## 2. 技术栈说明

- **前端框架**：原生 TypeScript + Three.js（无React/Vue）
- **构建工具**：Vite 5.x
- **3D 引擎**：three@0.160.x
- **类型定义**：@types/three
- **语言**：TypeScript 5.x（严格模式，target ES2020，module ESNext）

## 3. 文件结构与职责

```
auto171/
├── package.json          # 项目依赖与脚本
├── vite.config.js      # Vite构建配置（端口8080）
├── tsconfig.json      # TypeScript配置
├── index.html        # 入口页面
└── src/
    ├── main.ts              # 应用入口，动画循环
    ├── simulation/
    │   ├── OrbitSimulator.ts   # 核心：N体引力、位置/速度更新
    │   └── PlanetFactory.ts    # 随机行星生成
    └── ui/
        ├── UIManager.ts    # DOM控制面板、信息面板
        └── Renderer.ts     # Three.js场景封装
```

## 4. 核心类型定义

### 4.1 行星数据结构

```typescript
interface PlanetState {
  id: number;
  name: string;
  mass: number;           // 0.5-50 地球质量
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;         // 视觉半径 0.2-2.0
  color: string;
  inclination: number;        // 轨道倾角
  orbitRadius: number;      // 当前轨道半径(AU)
  eccentricity: number; // 轨道偏心率
}

interface SimulationConfig {
  G: number;              // 引力常数 0.1-2.0
  showOrbits: boolean;
  showVelocity: boolean;
  showFieldLines: boolean;
  showGrid: boolean;
  timeScale: number;
}
```

### 4.2 模块接口

```typescript
// PlanetFactory
class PlanetFactory {
  static generatePlanets(count: number): PlanetState[]
}

// OrbitSimulator
class OrbitSimulator {
  planets: PlanetState[]
  config: SimulationConfig
  update(dt: number): void
  setPlanetMass(id: number, mass: number): void
  setPlanetPosition(id: number, pos: THREE.Vector3): void
  getOrbitalParams(id: number): { radius: number, eccentricity: number }
  triggerGravityWave(position: THREE.Vector3): void
}

// Renderer
class Renderer {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  init(sceneContainer: HTMLElement): void
  createPlanets(planets: PlanetState[]): void
  updatePlanets(planets: PlanetState[]): void
  updateVisibility(config: SimulationConfig): void
  playSelectionPulse(planetId: number): void
  playGravityWave(position: THREE.Vector3): void
}

// UIManager
class UIManager {
  constructor(simulator: OrbitSimulator, renderer: Renderer)
  init(controlPanel: HTMLElement, infoPanel: HTMLElement): void
  onPlanetSelect(callback: (id: number) => void
  onMassChange(callback: (id: number, mass: number) => void
  updateInfo(time: number, planetId: number | null): void
}
```

## 5. 物理计算说明

### 5.1 万有引力公式
$$ F = G * m1 * m2 / r² $$

- 使用 Verlet 积分或半隐式欧拉法进行数值积分
- 中心恒星质量固定，作为主要引力源
- 行星间相互引力扰动计算（N体问题）

### 5.2 轨道参数计算
- 轨道半径：行星到恒星的距离
- 偏心率：基于当前位置与速度向量计算 e = |v × h| / (G*M) - 1（简化公式）

## 6. 性能优化策略

1. **帧率控制**：requestAnimationFrame，目标60fps，最低30fps
2. **更新频率**：速度矢量和引力场线每帧更新一次（已满足≤1次/帧）
3. **对象池**：轨道线和粒子复用，避免频繁创建销毁
4. **距离裁剪**：引力场线按区域密度30条，避免过度绘制
5. **粒子系统**：星空使用 Points + BufferGeometry，单次绘制2000粒子
