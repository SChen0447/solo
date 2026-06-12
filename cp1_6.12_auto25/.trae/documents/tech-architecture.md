## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        "index.html" --> "main.ts"
        "main.ts" --> "WeatherSystem.ts"
        "WeatherSystem.ts" --> "ParticlePool.ts"
        "WeatherSystem.ts" --> "RainRenderer.ts"
        "main.ts" --> "lil-gui控制面板"
    end

    subgraph "渲染层"
        "RainRenderer.ts" --> "Three.js Points几何体"
        "RainRenderer.ts" --> "ShaderMaterial"
        "main.ts" --> "Three.js Renderer"
        "main.ts" --> "OrbitControls"
    end

    subgraph "数据流"
        "用户输入" --> "main.ts"
        "main.ts" --> "WeatherSystem.update()"
        "WeatherSystem.update()" --> "ParticlePool.applyForces()"
        "ParticlePool.applyForces()" --> "粒子位置/速度/颜色更新"
        "粒子位置/速度/颜色更新" --> "RainRenderer.update()"
        "RainRenderer.update()" --> "Three.js BufferAttribute"
        "Three.js BufferAttribute" --> "GPU渲染"
    end
```

## 2. 技术说明

- **前端**：TypeScript + Three.js + Vite（纯前端项目，无后端）
- **构建工具**：Vite（快速HMR和ESM构建）
- **3D引擎**：Three.js（场景管理、渲染管线、相机控制）
- **GUI控制**：lil-gui（参数调节面板，替代自定义HTML控件）
- **语言**：TypeScript 严格模式，ESModule

## 3. 文件结构

```
├── package.json          # 依赖: three, @types/three, vite, typescript, lil-gui
├── vite.config.js        # Vite基础配置
├── tsconfig.json         # 严格模式, ESModule
├── index.html            # 入口HTML, 全屏canvas
└── src/
    ├── main.ts           # 初始化场景/相机/渲染器, 创建WeatherSystem, 动画循环
    └── weather/
        ├── WeatherSystem.ts  # 核心天气系统, 管理粒子池/风场/降水逻辑
        ├── ParticlePool.ts   # 粒子池, 生成/回收/存储粒子对象
        └── RainRenderer.ts   # 雨滴渲染, Three.js Points + ShaderMaterial
```

## 4. 数据流向

```
用户操作(切换模式/调节滑块)
    ↓
main.ts (接收GUI事件)
    ↓
WeatherSystem.setMode() / setScale() / setSpeed()
    ↓
WeatherSystem.update(deltaTime)
    ├── ParticlePool.update(windForce, gravity)
    │   ├── 应用风场力到每个粒子速度
    │   ├── 应用重力
    │   ├── 更新粒子位置
    │   ├── 检测地面碰撞 → 回收并重置
    │   └── 更新粒子颜色(亮蓝→灰蓝渐变)
    └── RainRenderer.update(particlePool)
        ├── 更新BufferAttribute(position, color, size)
        └── 更新风矢箭头
    ↓
Three.js Renderer.render(scene, camera)
```

## 5. 核心类型定义

```typescript
interface Particle {
  position: Float32Array;  // [x, y, z] 在大数组中的偏移
  velocity: Float32Array;  // [vx, vy, vz]
  life: number;            // 0-1 生命周期
  maxLife: number;         // 最大生命值
  color: Float32Array;     // [r, g, b]
  size: number;            // 粒子大小
  flickerPhase: number;    // 闪烁相位(随机)
}

interface WeatherMode {
  name: string;
  particleCount: number;   // 目标粒子数
  fallSpeed: number;       // 基准下落速度
  windStrength: number;    // 风力强度
  particleColor: [number, number, number]; // 基础粒子颜色
  particleSize: number;    // 基础粒子大小
}

interface WeatherState {
  currentMode: WeatherMode;
  targetMode: WeatherMode;
  transitionProgress: number; // 0-1 过渡进度
  scaleMultiplier: number;    // 用户调节的缩放倍率
  speedMultiplier: number;    // 用户调节的速度倍率
}
```

## 6. 性能优化策略

- **BufferGeometry + BufferAttribute**：避免每帧创建新几何体，直接更新属性缓冲区
- **对象池模式**：ParticlePool预分配最大粒子数(15000)，回收时重置属性而非销毁/创建
- **ShaderMaterial**：粒子闪烁和拖尾效果在GPU着色器中计算，减少CPU负载
- **过渡动画**：使用requestAnimationFrame逐帧插值粒子密度，不阻塞主线程
- **属性更新**：设置`needsUpdate = true`标记脏数据，最小化GPU上传
