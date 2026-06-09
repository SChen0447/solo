## 1. 架构设计

```mermaid
graph TD
    "浏览器" --> "index.html 入口"
    "index.html 入口" --> "Vite 构建"
    "Vite 构建" --> "main.ts 场景初始化"
    "main.ts 场景初始化" --> "Three.js Scene"
    "main.ts 场景初始化" --> "PerspectiveCamera"
    "main.ts 场景初始化" --> "OrbitControls"
    "main.ts 场景初始化" --> "WebGLRenderer"
    "main.ts 场景初始化" --> "SoundSource 音源模块"
    "main.ts 场景初始化" --> "ParticleSystem 粒子系统"
    "main.ts 场景初始化" --> "WaveRing 声波环管理"
    "SoundSource 音源模块" --> "SphereGeometry + MeshStandardMaterial"
    "SoundSource 音源模块" --> "Sprite 光晕层"
    "ParticleSystem 粒子系统" --> "BufferGeometry + PointsMaterial"
    "WaveRing 声波环管理" --> "RingGeometry 池 (最多6个)"
```

## 2. 技术说明

- 前端：Three.js@0.160 + TypeScript@5 + Vite@5
- 构建工具：Vite (原生ESM HMR)
- 类型系统：TypeScript 严格模式 (strict: true)
- 模块规范：ESNext
- 无后端、无数据库，纯前端3D可视化应用

## 3. 项目文件结构

| 路径 | 用途 |
|------|------|
| package.json | 项目依赖与脚本定义 (three, @types/three, typescript, vite) |
| index.html | 入口HTML页面，全屏画布容器 |
| vite.config.js | Vite基础配置 |
| tsconfig.json | TypeScript严格模式配置，module: ESNext |
| src/main.ts | 场景主入口：相机、渲染器、控制器、动画循环 |
| src/SoundSource.ts | 音源球体：位置/速度更新、颜色渐变、光晕脉动 |
| src/ParticleSystem.ts | 流体粒子：1500+粒子、多普勒颜色/密度、流体动力学更新 |
| src/WaveRing.ts | 声波环：发射/扩散/淡出生命周期管理，最多6个实例 |

## 4. 核心类与接口定义

### SoundSource
```typescript
interface ISoundSource {
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  readonly speed: number;
  update(delta: number): void;
}
```
- 球体Mesh：半径1，MeshStandardMaterial，emissive随速度从#00BFFF到#FF4500
- 光晕Sprite：径向渐变纹理，scale随正弦函数1.0~1.3脉动
- 运动轨迹：组合正弦曲线 Lissajous 路径，保证速度周期性变化

### ParticleSystem
```typescript
interface IParticleSystem {
  readonly points: THREE.Points;
  update(delta: number, sourcePos: THREE.Vector3, sourceVel: THREE.Vector3): void;
}
```
- 粒子数量：1500+，分布在半径15的球体内
- BufferGeometry存储：position(Float32Array)、color(Float32Array)、size(Float32Array)、basePosition(初始位置锚点)
- 多普勒计算：对每个粒子计算 dot(particleToSource, velocityDir) → [-1, 1]
  - 接近1（前方）：颜色向#FFAA00偏移、密度向音源偏移
  - 接近-1（后方）：颜色向#3344AA偏移、密度远离音源
- 流体动力学：简单弹簧回归(basePosition) + 音源方向扰动 + 随机游走

### WaveRing & WaveRingManager
```typescript
interface IWaveRingManager {
  readonly group: THREE.Group;
  update(delta: number, sourcePos: THREE.Vector3, sourceSpeed: number): void;
}
interface IWaveRing {
  readonly mesh: THREE.Mesh;
  readonly alive: boolean;
  reset(position: THREE.Vector3, speed: number): void;
  update(delta: number): void;
}
```
- RingGeometry：内半径=currentRadius，外半径=currentRadius+width
- 生命周期：3.0秒，半径从0.5线性扩展到(8 + speedFactor*5)
- 透明度：1.0 → 0.0；宽度：0.2 → 0.0
- 对象池：最多6个活跃实例，超出后复用最旧的环
- 发射间隔：0.5秒，发射时记录当前音源速度用于控制扩散速率

## 5. 性能优化策略

1. **粒子系统**：单个THREE.Points + BufferGeometry，单次DrawCall渲染1500+粒子
2. **声波环**：对象池模式复用RingGeometry和Material，避免频繁GC
3. **材质共享**：同类对象共享Material实例，仅更新uniform
4. **几何复用**：粒子不频繁重建BufferAttribute，仅在CPU端更新TypedArray并标记needsUpdate
5. **渲染循环**：使用Clock.getDelta()保证帧率无关的动画速度
6. **混合模式**：粒子采用AdditiveBlending提升视觉效果同时减少overdraw排序开销

## 6. 动画循环伪代码

```
初始化:
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0B0B1A)
  camera = PerspectiveCamera(75, w/h, 0.1, 1000)
  camera.position.set(0, 8, 20)
  renderer = WebGLRenderer({ antialias: true })
  controls = OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  添加 GridHelper(60, 60, 0x33FFAA, 0x33FFAA) → opacity 0.15
  添加 AmbientLight(0x404040)
  添加 PointLight 跟随音源

  soundSource = new SoundSource()
  particleSystem = new ParticleSystem()
  waveRingManager = new WaveRingManager()
  scene.add(soundSource.mesh, particleSystem.points, waveRingManager.group)

每帧(delta):
  soundSource.update(delta)
  particleSystem.update(delta, soundSource.position, soundSource.velocity)
  waveRingManager.update(delta, soundSource.position, soundSource.speed)
  controls.update()
  renderer.render(scene, camera)
```
