## 1. 架构设计

```mermaid
graph TD
    "A[index.html 入口]" --> "B[src/main.ts 场景主控制器]"
    "B" --> "C[src/cave.ts 洞穴网络模块]"
    "B" --> "D[src/particles.ts 水流粒子模块]"
    "B" --> "E[src/ui.ts 控制面板模块]"
    "C" --> "F[Three.js Scene]"
    "D" --> "F"
    "E" --> "B"
    "B" --> "G[WebGLRenderer 渲染循环]"
    "B" --> "H[OrbitControls 相机控制]"
```

## 2. 技术说明

- **前端框架**：原生 TypeScript + Three.js (无React/Vue，纯3D可视化场景)
- **构建工具**：Vite 5.x，端口 5173，开启 HMR
- **UI方案**：原生 DOM 实现控制面板（无外部UI库）
- **3D引擎**：Three.js 最新版，@types/three 提供类型支持
- **字体**：Inter (通过 CSS import 引入)

## 3. 模块职责划分

| 模块文件 | 职责 |
|----------|------|
| `src/main.ts` | 场景初始化、相机、渲染器、控制器、主渲染循环、全局参数调度 |
| `src/cave.ts` | 分形算法生成洞穴通道网络、Mesh管理、透明度/生长因子动画、射线检测点击、通道高亮 |
| `src/particles.ts` | BufferGeometry粒子系统、贝塞尔曲线路径、湍流偏移、帧率自适应调整 |
| `src/ui.ts` | DOM控制面板创建、滑动条事件绑定、平滑过渡动画、播放/暂停控制、信息弹窗 |

## 4. 核心数据模型

### 4.1 通道数据结构
```typescript
interface CaveChannel {
  id: number;
  points: THREE.Vector3[];       // 通道中心线控制点
  radius: number;                 // 基础半径 (0.5-2)
  length: number;                 // 通道总长度
  avgRadius: number;              // 平均半径
  connectedNodes: number[];       // 连接的节点编号
  mesh: THREE.Mesh;               // 通道网格
  highlightMesh?: THREE.Mesh;     // 高亮描边网格
  isHighlighted: boolean;
  children: CaveChannel[];        // 子分支(生长因子触发)
  isMain: boolean;                // 是否为主通道
  branchWidth: number;            // 分支宽度权重(粒子分流概率)
}
```

### 4.2 粒子数据结构
```typescript
interface WaterParticle {
  progress: number;               // 当前路径进度 (0-1)
  pathIndex: number;              // 当前所在路径索引
  speed: number;                  // 速度系数
  turbulenceOffset: number;       // 湍流相位偏移
  color: THREE.Color;             // 当前颜色
}
```

### 4.3 全局状态
```typescript
interface AppState {
  waterSpeed: number;             // 0-2, default 0.3
  caveOpacity: number;            // 0.1-1.0, default 0.7
  growthFactor: number;           // 0-1, default 0
  isPlaying: boolean;             // 时间模拟播放状态
  selectedChannel: CaveChannel | null;
}
```

## 5. 关键算法与实现思路

### 5.1 洞穴网络生成 (分形算法)
- 主通道：5条，从入口(0,0,0)向不同方向延伸，使用随机游走 + 中点位移生成控制点
- 分支通道：12条，在主通道随机位置分叉，方向基于主通道切向量的随机扰动
- 通道网格：使用 THREE.TubeGeometry 沿 CatmullRomCurve3 中心线扫描生成
- 岩壁纹理：自定义 ShaderMaterial，实现纵向 #8b5a2b → #5c3a1e 渐变 + 0.5单位凹凸噪点(Simplex noise)

### 5.2 水流路径与粒子分流
- 定义 15 个控制点构成多段贝塞尔曲线 (CubicBezierCurve3)
- 分叉口决策：当粒子到达分叉点，按分支宽度 branchWidth 加权随机选择路径
- 湍流偏移：每个粒子位置附加 `sin(time * 0.5 + phase) * 0.1` 的法向偏移

### 5.3 帧率自适应
- 每 2 秒采样平均 FPS
- 若 FPS < 30，粒子数从 500 减半至 250
- 恢复后不自动增加（保持体验稳定性）

### 5.4 平滑过渡动画
- 参数变化时记录起始值、目标值、开始时间
- 每帧用 easeInOutCubic 插值更新：`t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1`
- 动画时长 0.3 秒

### 5.5 射线检测点击
- THREE.Raycaster，阈值 0.5 单位
- 仅检测通道 Mesh，忽略粒子
- 命中后切换 isHighlighted，动态添加 emissive 发光材质并使用 shader 实现 1Hz 脉动

### 5.6 时间模拟
- 点击播放后，生长因子按 0→1→0 循环，周期 8 秒
- 每次从 0→1 的上升沿，随机在主通道上生成 3-5 条细分子分支（半径 0.1-0.3）
- 子分支动画渐显（透明度 0→目标值）

## 6. 文件结构

```
e:\solo\VersionFast\tasks\auto126\
├── .trae\documents\
│   ├── PRD.md
│   └── TECH.md
├── src\
│   ├── main.ts
│   ├── cave.ts
│   ├── particles.ts
│   └── ui.ts
├── index.html
├── vite.config.js
├── tsconfig.json
├── package.json
└── package-lock.json
```

## 7. 性能优化策略

1. **粒子系统**：使用 BufferGeometry + PointsMaterial，单 Draw Call
2. **洞穴网格**：共享材质实例，仅修改 uniform 变量
3. **凹凸噪点**：顶点着色器中计算，避免高多边形建模
4. **状态更新**：按需更新，避免每帧重建几何
5. **响应式**：监听 resize，仅更新相机 aspect 和 renderer size
