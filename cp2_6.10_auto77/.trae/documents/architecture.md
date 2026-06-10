## 1. 架构设计

```mermaid
graph TD
    "index.html" --> "入口页面与UI容器"
    "main.ts" --> "场景初始化与主循环"
    "main.ts" --> "butterfly.ts"
    "main.ts" --> "particles.ts"
    "butterfly.ts" --> "蝴蝶翅膀几何与材质"
    "particles.ts" --> "鳞粉粒子系统"
    "vite.config.js" --> "构建配置"
    "tsconfig.json" --> "TypeScript配置"
```

## 2. 技术描述

- **前端框架**：纯TypeScript实现，无UI框架依赖
- **3D渲染**：Three.js@0.160（WebGL渲染）
- **构建工具**：Vite@5（devServer端口3000，支持TypeScript）
- **类型系统**：TypeScript严格模式，target ES2020，DOM类型
- **无后端**：纯前端静态应用
- **无数据库**：所有状态运行时内存管理

## 3. 项目文件结构

| 文件路径 | 作用 |
|---------|------|
| package.json | 依赖管理（three@0.160, @types/three, typescript, vite@5），启动脚本npm run dev |
| vite.config.js | Vite配置，TypeScript支持，devServer port:3000 |
| tsconfig.json | TS严格模式，target:ES2020，lib含DOM |
| index.html | 入口页面，3D画布容器，UI覆盖层，样式内联 |
| src/main.ts | 场景初始化、相机、渲染器、轨道控制器、主循环、UI控制、光源拖拽、响应式适配 |
| src/butterfly.ts | 蝴蝶翅膀类：几何体（三椭圆组合+鳞片纹理）、半透明渐变材质、结构色折射计算、光线方向参数接口 |
| src/particles.ts | 粒子系统类：BufferGeometry管理1000+粒子、PointsMaterial+onBeforeCompile视角折射色、发射速率控制、悬停加速、透明度受光强影响、距离回收 |

## 4. 核心模块设计

### 4.1 Butterfly 类 (butterfly.ts)

```typescript
class Butterfly {
  group: THREE.Group;
  wings: THREE.Mesh[];
  lightDirection: THREE.Vector3;
  
  constructor(scene: THREE.Scene);
  createWingGeometry(): THREE.BufferGeometry;   // 三扁椭圆+鳞片三角形
  createWingMaterial(): THREE.ShaderMaterial;   // 半透明渐变，根部深蓝→外部紫
  updateLightDirection(dir: THREE.Vector3): void; // 入射角→色相偏移
}
```

**关键实现**：
- 翅膀几何：使用CylinderGeometry压扁或自定义BufferGeometry生成三个扁椭圆合并
- 鳞片纹理：在翅膀表面随机生成小三角形面片，叠加半透明
- 结构色：ShaderMaterial uniforms传入光线方向，片元着色器计算法线与光线点积映射HSL色相

### 4.2 ParticleSystem 类 (particles.ts)

```typescript
class ParticleSystem {
  points: THREE.Points;
  count: number;
  maxCount: number;
  emissionRate: number;
  paused: boolean;
  lightIntensity: number;
  
  constructor(scene: THREE.Scene, wingGeometries: THREE.BufferGeometry[]);
  emit(particlesPerFrame: number): void;       // 从翅膀表面随机点发射
  update(delta: number, mouseHover: boolean): void; // 飘散、旋转、回收
  setEmissionRate(rate: number): void;
  setLightIntensity(intensity: number): void;  // 0.3-1.0 → 透明度0.2-0.8
  togglePause(): void;
  recycleDistantParticles(maxDistance: number): void;
}
```

**关键实现**：
- 粒子几何：BufferGeometry存储位置/颜色/速度/旋转/生命周期属性
- 视角折射色：onBeforeCompile注入着色器，vViewDirection与vNormal夹角→蓝→紫→橙渐变
- 悬停检测：Raycaster检测鼠标附近粒子密集度，触发加速和透明度提升
- 回收机制：每帧检查距离翅膀中心>5的粒子，透明度线性淡出0.5秒后重置位置

### 4.3 主程序 (main.ts)

```typescript
// 场景、相机、渲染器、轨道控制器初始化
// 创建Butterfly和ParticleSystem实例
// 光源（带可视化拖拽球体）
// 星空背景（CanvasTexture或Points模拟）
// UI控制面板事件绑定
// 响应式监听（resize, orientationchange, 768px断点）
// FPS监控（performance.now）
// 主循环：更新→渲染
```

## 5. 性能优化策略

- **几何优化**：所有模型使用BufferGeometry，粒子用THREE.Points
- **材质优化**：禁用shadowMap，单方向光，无抗锯齿（性能优先）
- **粒子限制**：上限2000，超出自动回收远距离粒子
- **帧率监控**：低于30fps时动态降低发射速率
- **内存管理**：对象池复用粒子，避免频繁GC

## 6. 性能指标

- 目标平台：桌面端1920x1080，Intel i5+，8GB RAM
- 目标帧率：稳定≥30fps
- 粒子峰值：2000不掉帧
- 内存占用：<200MB
