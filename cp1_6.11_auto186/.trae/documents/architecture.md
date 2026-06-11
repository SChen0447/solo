## 1. 架构设计

```mermaid
graph TD
    "Browser" --> "index.html"
    "index.html" --> "main.ts"
    "main.ts" --> "Three.js Scene"
    "main.ts" --> "UIControls"
    "main.ts" --> "Crystal Cluster Manager"
    "main.ts" --> "CrystalFragments"
    "Crystal Cluster Manager" --> "Crystal.ts"
    "Crystal.ts" --> "Three.js Geometries/Materials"
    "Crystal.ts" --> "GSAP Animations"
    "Crystal.ts" --> "Web Audio API"
    "UIControls" --> "DOM Elements"
    "UIControls" --> "Parameter Callbacks"
    "CrystalFragments" --> "Particle System"
    "Three.js Scene" --> "Renderer Output"
```

## 2. 技术描述

- **前端框架**：Vanilla TypeScript + Three.js 0.160.0（无React/Vue，用户明确指定纯TS实现）
- **构建工具**：Vite 5.x，启用TypeScript插件，base设为'./'
- **动画库**：GSAP 3.x，用于参数平滑过渡和水晶生长动画
- **3D引擎**：Three.js 0.160.0，@types/three提供类型支持
- **文件导出**：file-saver，用于PNG全景图下载
- **音频**：原生Web Audio API，合成水晶碎裂音效
- **UI框架**：原生DOM + CSS，Font Awesome图标库

## 3. 路由定义
| 路由 | 用途 |
|-----|------|
| / | 主场景页面（单页应用，无路由跳转） |

## 4. 文件结构

```
e:\solo\VersionFast\tasks\auto186/
├── .trae/documents/
│   ├── prd.md
│   └── architecture.md
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── main.ts          # Three.js场景初始化、相机、渲染器、动画循环、光照、resize
    ├── crystal.ts       # Crystal类：单个晶体/簇的生成、材质、生长动画、爆破效果
    ├── controls.ts      # UIControls类：右侧控制面板DOM、滑块监听、参数回调
    └── particles.ts     # CrystalFragments类：碎片粒子系统管理
```

## 5. 核心模块设计

### 5.1 Crystal 模块 (crystal.ts)
```typescript
interface CrystalParams {
  temperature: number;  // 100-500 影响颜色/透明度
  growthSpeed: number;  // 1-10 生长动画时长
}

class CrystalCluster {
  group: THREE.Group;
  crystals: THREE.Mesh[];
  constructor(position: THREE.Vector3, rockNormal: THREE.Vector3);
  generateCrystal(type: 'hexagonal' | 'rhombohedral' | 'acicular'): THREE.Mesh;
  updateMaterial(params: CrystalParams): void;
  playGrowthAnimation(duration: number): gsap.core.Timeline;
  triggerBurst(origin: THREE.Vector3): CrystalFragment[];
  playHoverGlow(active: boolean): void;
}
```

### 5.2 UIControls 模块 (controls.ts)
```typescript
interface GeologyParams {
  temperature: number;  // 100-500, step 10
  growthSpeed: number;  // 1-10, step 1
  rockDensity: number;  // 1-10, step 1
}

class UIControls {
  container: HTMLElement;
  params: GeologyParams;
  onParamsChange: (params: GeologyParams) => void;
  constructor(container: HTMLElement);
  createSlider(config: SliderConfig): HTMLInputElement;
  getParams(): GeologyParams;
}
```

### 5.3 CrystalFragments 模块 (particles.ts)
```typescript
interface FragmentData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  rotationSpeed: THREE.Euler;
  life: number;
  maxLife: number;
  size: number;
}

class CrystalFragments {
  scene: THREE.Scene;
  particles: THREE.Points;
  fragmentData: FragmentData[];
  constructor(scene: THREE.Scene);
  spawnBurst(origin: THREE.Vector3, count: number = 30): void;
  update(deltaTime: number): void;
}
```

### 5.4 主入口 (main.ts)
- 场景/相机/渲染器初始化：PerspectiveCamera(75, aspect, 0.1, 1000)，WebGLRenderer抗锯齿
- 轨道控制器：OrbitControls.enableDamping=true，阻尼系数0.05
- 光照：AmbientLight(0x404050, 0.5) + 多个PointLight跟随水晶位置
- 洞穴生成：根据rockDensity参数生成分支通道，程序计算岩壁位置
- 地面纹理：Canvas 2D绘制不规则多边形玄武岩裂缝，作为纹理贴图
- 动画循环：requestAnimationFrame，更新粒子系统、控制器、渲染场景
- 交互：Raycaster检测鼠标悬停水晶，双击触发爆破+音效
- 导出功能：renderer.domElement.toDataURL() + file-saver保存PNG

## 6. 性能优化

- 水晶几何复用：同类晶体共享BufferGeometry实例
- 材质实例化：相同参数水晶共享Material引用
- 粒子系统优化：使用THREE.Points而非独立Mesh，单Draw Call
- 渲染优化：固定像素比window.devicePixelRatio（上限2），视口剔除
- 动画优化：GSAP自动清理完成的Tween，避免内存泄漏
